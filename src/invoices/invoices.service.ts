import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceNumberUtil } from './utils/invoice-number.util';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  InvoiceStatus,
  InvoiceType,
  MovementType,
  RequestType,
} from '@prisma/client';
import type { InvoicePdfData } from '../pdf/pdf.types';
import { CurrencyEnum } from './enums/currency.enum';
import { MovementsService } from 'src/inventory/movements.service';
import { CreateStockMovementDto } from 'src/inventory/dto/create-stock-movement.dto';
import { PaymentsService } from 'src/payments/payments.service';
import { CreatePaymentDto } from 'src/payments/dto/create-payment.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly paymentsService: PaymentsService,
    private readonly invoiceNumberUtil: InvoiceNumberUtil,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly movementsService: MovementsService,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, user: AuthenticatedUser) {
    const request = await this.prisma.request.findUnique({
      where: { id: createInvoiceDto.requestId },
      select: { id: true, type: true, status: true, customerId: true },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { requestId: createInvoiceDto.requestId },
      select: { id: true, invoiceNumber: true, status: true },
    });

    if (existingInvoice) {
      if (existingInvoice.status === InvoiceStatus.paid) {
        throw new BadRequestException(
          'الطلب لديه فاتورة مدفوعة بالكامل بالفعل',
        );
      }
      if (existingInvoice.status === InvoiceStatus.paid_partial) {
        throw new BadRequestException('الطلب لديه فاتورة غير مكتملة');
      }
    }
    createInvoiceDto.type =
      request.type === RequestType.external
        ? InvoiceType.external
        : InvoiceType.internal;

    const isTechnician = user.role === 'Technician';
    if (isTechnician) {
      const assignment = await this.prisma.technicianAssignment.findFirst({
        where: {
          requestId: createInvoiceDto.requestId,
          technicianId: user.id,
          isActive: true,
        },
      });
      if (!assignment) {
        throw new ForbiddenException('لست مسنداً إلى هذا الطلب');
      }
    }

    const {
      payment,
      locationURL,
      requestId,
      type,
      items,
      status,
      totalCurrency = payment.currency,
      totalAmount,
      warrantyPeriod,
      notes,
      needsCenterMaintenance,
    } = createInvoiceDto;

    const spareParts = await this.prisma.sparePart.findMany({
      where: {
        id: { in: items.map((i) => i.sparePartId) },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        costUsd: true,
        costSyp: true,
      },
    });

    const stockMap = new Map(spareParts.map((sp) => [sp.id, sp]));

    for (const item of items) {
      const part = stockMap.get(item.sparePartId);
      if (!part) {
        throw new BadRequestException(
          `قطعة الغيار ${item.sparePartId} غير موجودة أو غير نشطة`,
        );
      }
      const qty = item.quantity ?? 1;
      if (part.quantity < qty) {
        throw new BadRequestException(
          `المخزون غير كافٍ لـ ${part.name}: المتاح ${part.quantity}، والمطلوب ${qty}`,
        );
      }
    }

    const totalPrice = items.reduce((sum, item) => {
      const qty = item.quantity ?? 1;
      const price = item.unitPrice ?? 0;
      return sum + qty * price;
    }, 0);

    const calculateCost = (currency: CurrencyEnum) => {
      const costField = currency === CurrencyEnum.SYP ? 'costSyp' : 'costUsd';

      return items.reduce((sum, item) => {
        const qty = item.quantity ?? 1;
        const stock = stockMap.get(item.sparePartId);
        const cost = Number(stock?.[costField]) ?? 0;
        return sum + qty * cost;
      }, 0);
    };

    const totalCost = calculateCost(totalCurrency);
    const netProfit = totalAmount - totalCost;
    const invoiceStatus =
      totalAmount - payment.amount === 0
        ? InvoiceStatus.paid
        : InvoiceStatus.paid_partial;

    if (invoiceStatus != status) {
      throw new BadRequestException('الحالة غير مطابقة للمدفوع');
    }

    const invoice = await this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateUniqueInvoiceNumber();
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          requestId,
          type,
          status: invoiceStatus,
          netProfit,
          totalAmount,
          totalCurrency,
          paidAmount: payment.amount,
          remainingAmount: totalAmount - payment.amount,
          warrantyPeriod: warrantyPeriod ?? null,
          needsCenterMaintenance: needsCenterMaintenance ?? null,
          notes: notes ?? null,
          items: {
            create: items.map((item) => ({
              sparePartId: item.sparePartId,
              quantity: item.quantity ?? 1,
              unitPrice: item.unitPrice ?? 0,
              currency: totalCurrency,
              totalPrice: (item.quantity ?? 1) * (item.unitPrice ?? 0),
            })),
          },
        },
        include: { items: true, payments: true },
      });

      // movement
      for (const item of items) {
        const dto: CreateStockMovementDto = {
          partId: item.sparePartId,
          movementType: MovementType.issue,
          quantity: item.quantity,
          reference: 'استهلاك فواتير',
        };
        await this.movementsService.create(dto, user.id, tx);
      }
      const dto: CreatePaymentDto = {
        ...payment,
        invoiceId: createdInvoice.id,
      };
      //create first payment
      await this.paymentsService.create(dto, user, tx);

      if (locationURL !== undefined) {
        await this.prisma.customer.update({
          where: { id: request.customerId },
          data: { locationLink: locationURL },
        });
      }
      this.logger.log(
        `Invoice ${createdInvoice.invoiceNumber} created for request ${requestId}`,
      );

      return createdInvoice;
    });

    return invoice;
  }

  async findAll(
    page: number,
    limit: number,
    userId: string,
    isTechnician: boolean,
    requestId?: string,
    type?: InvoiceType,
    status?: InvoiceStatus,
  ) {
    return this.invoicesRepository.findMany({
      page,
      limit,
      requestId,
      type,
      status,
      userId,
      isTechnician,
    });
  }

  async findOne(id: string, userId: string, isTechnician: boolean) {
    const invoice = await this.invoicesRepository.findByIdWithAuthorization(
      id,
      userId,
      isTechnician,
    );
    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }
    return invoice;
  }

  async getInvoicePdfData(
    id: string,
    userId: string,
    isTechnician: boolean,
  ): Promise<InvoicePdfData> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                firstPhone: true,
                secondPhone: true,
                address: true,
              },
            },
          },
        },
        items: {
          include: {
            sparePart: {
              select: {
                name: true,
              },
            },
          },
        },
        payments: true,
      },
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

    const paidAmount = invoice.payments.reduce(
      (sum, payment) =>
        sum + Number(payment.convertedAmount || payment.amount || 0),
      0,
    );

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      requestId: invoice.requestId,
      requestNumber: invoice.request.requestNumber,
      createdAt: invoice.createdAt,
      customer: {
        id: invoice.request.customer.id,
        name: invoice.request.customer.name,
        firstPhone: invoice.request.customer.firstPhone,
        secondPhone: invoice.request.customer.secondPhone ?? undefined,
        address: invoice.request.customer.address ?? undefined,
      },
      items: invoice.items.map((item) => ({
        id: item.id,
        sparePartId: item.sparePartId,
        sparePartName: item.sparePart?.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        currency: item.currency,
        totalPrice: Number(item.totalPrice),
      })),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        dollarExchangeRate: Number(payment.dollarExchangeRate),
        convertedAmount: Number(payment.convertedAmount),
        paidAt: payment.paidAt,
      })),
      totalAmount: Number(invoice.totalAmount),
      totalCurrency: invoice.totalCurrency,
      paidAmount,
      remainingAmount: Number(invoice.remainingAmount),
      warrantyPeriod: invoice.warrantyPeriod ?? undefined,
      needsCenterMaintenance: invoice.needsCenterMaintenance ?? undefined,
      notes: invoice.notes ?? undefined,
    };
  }

  private async generateUniqueInvoiceNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const candidate = this.invoiceNumberUtil.generate();
      const existing = await this.prisma.invoice.findUnique({
        where: { invoiceNumber: candidate },
      });
      if (!existing) return candidate;
    }
    throw new BadRequestException('فشل إنشاء رقم فاتورة فريد');
  }
}
