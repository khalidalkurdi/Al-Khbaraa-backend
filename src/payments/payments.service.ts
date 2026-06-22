import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceStatus } from '@prisma/client';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, user: AuthenticatedUser) {
    const {
      invoiceId,
      amount,
      currency,
      paymentMethod,
      dollarExchangeRate: providedDollarRate,
      convertedAmount: providedConvertedAmount,
    } = createPaymentDto;

    const amountDecimal = toDecimal(amount);
    if (amountDecimal.lessThanOrEqualTo(0)) {
      throw new BadRequestException('يجب أن تكون قيمة الدفعة موجبة');
    }

    const invoice = await this.prisma.invoice.findUnique({
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
      },
    });

    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }

    const isTechnician = user.role === 'Technician';
    if (isTechnician) {
      const assignment = await this.prisma.technicianAssignment.findFirst({
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

    let dollarExchangeRate: Decimal;
    let convertedAmount: Decimal = new Decimal(0);

    const invoiceCurrency = invoice.totalCurrency as CurrencyEnum;

    if (currency !== invoiceCurrency) {
      const settings = await this.prisma.getCenterSettings();
      if (!settings) {
        throw new BadRequestException('معدل الصرف غير مكوّن');
      }
      dollarExchangeRate = new Decimal(settings.dollarExchangeRate);
      if (
        currency === CurrencyEnum.USD &&
        invoiceCurrency === CurrencyEnum.SYP
      ) {
        convertedAmount = amountDecimal.times(dollarExchangeRate);
      } else if (
        currency === CurrencyEnum.SYP &&
        invoiceCurrency === CurrencyEnum.USD
      ) {
        convertedAmount = amountDecimal.dividedBy(dollarExchangeRate);
      } else {
        convertedAmount = new Decimal(amount);
      }
    }

    const newPaidAmount = new Decimal(invoice.paidAmount).plus(convertedAmount);
    const newRemainingAmount = new Decimal(invoice.remainingAmount).minus(
      convertedAmount,
    );
    const statusChanged =
      invoice.status === InvoiceStatus.paid_partial &&
      newRemainingAmount.lessThanOrEqualTo(0);
    const newStatus = statusChanged ? InvoiceStatus.paid : invoice.status;

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          invoiceId,
          amount: amountDecimal,
          currency,
          paymentMethod,
          dollarExchangeRate,
          convertedAmount,
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
        },
        include: { payments: true },
      });

      return {
        invoice: updatedInvoice,
      };
    });

    this.logger.log(
      `Payment created for invoice ${invoiceId}, amount: ${amountDecimal.toString()} ${currency}`,
    );

    return payment.invoice;
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
        ...(currency && { currency: currency as 'SYP' | 'USD' }),
        ...(paymentMethod && {
          paymentMethod: paymentMethod as 'cash' | 'sham_cash',
        }),
      },
      orderBy: { paidAt: 'desc' },
    });
  }
}
