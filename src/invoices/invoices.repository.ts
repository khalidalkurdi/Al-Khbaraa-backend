import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, InvoiceType, InvoiceStatus } from '@prisma/client';
import { InvoiceQueryDto } from './dto/invoice-query.dto';

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.InvoiceCreateInput) {
    return this.prisma.invoice.create({
      data,
      include: {
        items: true,
        request: true,
      },
    });
  }

  async findMany(query: InvoiceQueryDto) {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      currency,
      paymentMethod,
      search,
      endDate,
      startDate,
    } = query;

    const where: Prisma.InvoiceWhereInput = {};

    // Filter by type and status
    if (type) where.type = type;
    if (status) where.status = status;

    // Filter by currency
    if (currency) where.currency = currency;

    // Filter by payment method
    if (paymentMethod) where.paymentMethod = paymentMethod;

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        {
          request: { requestNumber: { contains: search } },
        },
        {
          request: {
            customer: {
              name: { contains: search },
            },
          },
        },
        {
          request: {
            customer: {
              firstPhone: { contains: search },
            },
          },
        },
        {
          request: {
            customer: {
              secondPhone: { contains: search },
            },
          },
        },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          request: {
            include: { customer: true },
          },
          payments: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        request: {
          include: { customer: true },
        },
        payments: true,
      },
    });
  }

  async findByIdWithAuthorization(
    id: string,
    userId: string,
    isTechnician: boolean,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        request: true,
        items: true,
        payments: true,
      },
    });

    if (!invoice) return null;

    if (isTechnician) {
      const assignment = await this.prisma.technicianAssignment.findFirst({
        where: {
          requestId: invoice.requestId,
          technicianId: userId,
          isActive: true,
        },
      });
      if (!assignment) return null;
    }

    return invoice;
  }

  async findByNumber(invoiceNumber: string) {
    return this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: { items: true },
    });
  }
}
