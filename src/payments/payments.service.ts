import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { CurrencyEnum } from '../invoices/enums/currency.enum';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

function toDecimal(value: string | number): Decimal {
  return new Decimal(value);
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    user: AuthenticatedUser,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const { invoiceId, amount, currency, paymentMethod } = createPaymentDto;

    const amountDecimal = toDecimal(amount);
    if (amountDecimal.lessThanOrEqualTo(0)) {
      throw new BadRequestException('يجب أن تكون قيمة الدفعة موجبة');
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        totalCurrency: true,
        requestId: true,
        request: {
          select: {
            customerId: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }
    if (invoice.totalAmount === invoice.paidAmount) {
      throw new BadRequestException('الفاتورة مدفوعة بالكامل بالفعل');
    }

    if (invoice.status === InvoiceStatus.refunded) {
      throw new BadRequestException('لا يمكن الدفع لفاتورة مسترجعة');
    }

    const isTechnician = user.role === 'Technician';
    if (isTechnician) {
      const assignment = await prisma.technicianAssignment.findFirst({
        where: {
          requestId: invoice.requestId,
          technicianId: user.id,
          isActive: true,
        },
      });
      if (!assignment) {
        throw new ForbiddenException('لست مسنداً إلى هذا الطلب');
      }
    }

    let convertedAmount: Decimal = amountDecimal;

    const invoiceCurrency = invoice.totalCurrency as CurrencyEnum;
    const settings = await prisma.centerSettings.findFirst();
    const dollarExchangeRate = settings?.dollarExchangeRate;
    if (!dollarExchangeRate || Number(dollarExchangeRate) <= 0) {
      throw new BadRequestException('معدل الصرف غير مكوّن أو غير صالح');
    }

    if (currency !== invoiceCurrency) {
      const safeRate = new Decimal(dollarExchangeRate);
      if (safeRate.isZero() || !safeRate.isFinite()) {
        throw new BadRequestException('معدل الصرف غير صالح');
      }
      if (
        currency === CurrencyEnum.USD &&
        invoiceCurrency === CurrencyEnum.SYP
      ) {
        convertedAmount = amountDecimal.times(safeRate);
      } else if (
        currency === CurrencyEnum.SYP &&
        invoiceCurrency === CurrencyEnum.USD
      ) {
        convertedAmount = amountDecimal.dividedBy(safeRate);
      }
    }

    const existingPayments = await prisma.payment.count({
      where: { invoiceId, isActive: true },
    });
    if (
      convertedAmount.greaterThan(invoice.remainingAmount) &&
      invoice.status === InvoiceStatus.paid_partial &&
      existingPayments > 0
    ) {
      throw new BadRequestException(
        `المبلغ المدخل (${convertedAmount.toFixed(2)} ${currency}) يتجاوز المبلغ المتبقي (${invoice.remainingAmount.toFixed(2)} ${invoiceCurrency})`,
      );
    }
    const executePayment = async (tx: Prisma.TransactionClient) => {
      await tx.payment.create({
        data: {
          invoiceId,
          amount: amountDecimal,
          currency,
          paymentMethod,
          dollarExchangeRate,
          convertedAmount,
        },
      });

      const latestInvoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!latestInvoice) {
        throw new NotFoundException('الفاتورة غير موجودة');
      }

      const latestNewStatus =
        latestInvoice.status === InvoiceStatus.paid_partial &&
        latestInvoice.remainingAmount
          .minus(convertedAmount)
          .lessThanOrEqualTo(0)
          ? InvoiceStatus.paid
          : latestInvoice.status;

      let invoiceWithPayments;
      if (existingPayments === 0 && latestInvoice.paidAmount.greaterThan(0)) {
        invoiceWithPayments = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: { items: true, payments: true },
        });
      } else {
        invoiceWithPayments = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: { increment: convertedAmount },
            remainingAmount: { decrement: convertedAmount },
            status: latestNewStatus,
          },
          include: { items: true, payments: true },
        });
      }

      return invoiceWithPayments;
    };

    let result;
    if (prisma === this.prisma) {
      result = await this.prisma.$transaction(
        async (tx) => {
          return await executePayment(tx);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } else {
      result = await executePayment(prisma);
    }
    this.logger.log(`Payment created for invoice ${invoiceId}`);
    return result;
  }

  async findByInvoice(
    invoiceId: string,
    userId: string,
    isTechnician: boolean,
    currency?: string,
    paymentMethod?: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, requestId: true },
    });

    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }

    if (isTechnician) {
      const assignment = await this.prisma.technicianAssignment.findFirst({
        where: {
          requestId: invoice.requestId,
          technicianId: userId,
          isActive: true,
        },
      });
      if (!assignment) {
        throw new ForbiddenException('لست مسنداً إلى هذا الطلب');
      }
    }

    return this.prisma.payment.findMany({
      where: {
        invoiceId,
        isActive: true,
        ...(currency && { currency: currency as 'SYP' | 'USD' }),
        ...(paymentMethod && {
          paymentMethod: paymentMethod as 'cash' | 'sham_cash',
        }),
      },
      orderBy: { paidAt: 'desc' },
    });
  }
}
