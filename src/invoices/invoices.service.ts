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
import { RequestStatus } from '@prisma/client';
import type { InvoicePdfData } from '../pdf/pdf.types';

interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly invoiceNumberUtil: InvoiceNumberUtil,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, user: AuthenticatedUser) {
    const { requestId, type, items, warrantyPeriod, notes, needsCenterMaintenance } = createInvoiceDto;

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: { id: true, type: true, status: true },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const isTechnician = user.roles.includes('Technician');
    if (isTechnician) {
      const assignment = await this.prisma.technicianAssignment.findFirst({
        where: { requestId, technicianId: user.id, isActive: true },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not assigned to this request');
      }
    }

    const spareParts = await this.prisma.sparePart.findMany({
      where: {
        id: { in: items.map((i) => i.sparePartId) },
        isActive: true,
      },
      select: { id: true, name: true, quantity: true },
    });

    const stockMap = new Map(spareParts.map((sp) => [sp.id, sp]));

    for (const item of items) {
      const part = stockMap.get(item.sparePartId);
      if (!part) {
        throw new BadRequestException(`Spare part ${item.sparePartId} not found or inactive`);
      }
      const qty = item.quantity ?? 1;
      if (part.quantity < qty) {
        throw new BadRequestException(
          `Insufficient stock for ${part.name}: available ${part.quantity}, requested ${qty}`,
        );
      }
    }

    const totalAmount = items.reduce((sum, item) => {
      const qty = item.quantity ?? 1;
      const price = item.unitPrice ?? 0;
      return sum + qty * price;
    }, 0);

    const currency = items[0]?.currency ?? 'SYP';

    const invoiceNumber = await this.generateUniqueInvoiceNumber();

    const invoice = await this.prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          requestId,
          technicianId: user.id,
          type,
          status: 'paid_partial',
          totalAmount,
          totalCurrency: currency,
          warrantyPeriod: warrantyPeriod ?? null,
          needsCenterMaintenance: needsCenterMaintenance ?? null,
          notes: notes ?? null,
          items: {
            create: items.map((item) => ({
              sparePartId: item.sparePartId,
              quantity: item.quantity ?? 1,
              unitPrice: item.unitPrice ?? 0,
              currency: item.currency,
              totalPrice: (item.quantity ?? 1) * (item.unitPrice ?? 0),
              notes: item.notes ?? null,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        const qty = item.quantity ?? 1;
        await tx.sparePart.update({
          where: { id: item.sparePartId },
          data: { quantity: { decrement: qty } },
        });
      }

      const newStatus = type === 'external' ? RequestStatus.completed : RequestStatus.pulltocenter;
      await tx.request.update({
        where: { id: requestId },
        data: { status: newStatus },
      });

      return createdInvoice;
    });

    this.realtimeGateway.sendToAll('invoice.created', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      requestId,
      type,
      totalAmount,
      totalCurrency: currency,
      createdAt: invoice.createdAt,
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} created for request ${requestId}`);

    return invoice;
  }

  async findAll(page: number, limit: number, userId: string, isTechnician: boolean) {
    return this.invoicesRepository.findMany({
      page,
      limit,
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
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async getInvoicePdfData(id: string, userId: string, isTechnician: boolean): Promise<InvoicePdfData> {
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
        technician: {
          select: {
            id: true,
            fullName: true,
            email: true,
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
      throw new NotFoundException('Invoice not found');
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
        throw new ForbiddenException('You are not assigned to this request');
      }
    }

    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.convertedAmount || payment.amount || 0),
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
      technician: invoice.technician,
      items: invoice.items.map((item) => ({
        id: item.id,
        sparePartId: item.sparePartId,
        sparePartName: item.sparePart?.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        currency: item.currency,
        totalPrice: Number(item.totalPrice),
        notes: item.notes ?? undefined,
      })),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        dollarExchangeRate: Number(payment.dollarExchangeRate),
        convertedAmount: Number(payment.convertedAmount),
        paidAt: payment.paidAt,
        notes: payment.notes ?? undefined,
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
    throw new BadRequestException('Failed to generate unique invoice number');
  }
}
