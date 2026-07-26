import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { toSyriaDate } from '../common/utils/syria-date.util';

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
      type,
      status,
      currency,
      paymentMethod,
      search,
      endDate,
      startDate,
    } = query;
    const page = query.page || 1;
    const limit = query.limit || 10;

    const where: Prisma.InvoiceWhereInput = {};

    // Filter by type and status
    if (type) where.type = type;
    if (status) where.status = status;

    // Filter by currency
    if (currency) where.totalCurrency = currency;

    if (paymentMethod) {
      where.payments = {
        some: {
          paymentMethod: paymentMethod,
        },
      };
    }

    // Date range filter (convert Syrian dates to UTC midnight boundaries)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const syriaStart = toSyriaDate(startDate);
        where.createdAt.gte = new Date(
          syriaStart.getUTCFullYear(),
          syriaStart.getUTCMonth(),
          syriaStart.getUTCDate(),
        );
      }
      if (endDate) {
        const syriaEnd = toSyriaDate(endDate);
        where.createdAt.lt = new Date(
          syriaEnd.getUTCFullYear(),
          syriaEnd.getUTCMonth(),
          syriaEnd.getUTCDate() + 1,
        );
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

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { ...where, isActive: true },
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
      this.prisma.invoice.count({ where: { ...where, isActive: true } }),
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
          include: {
            customer: true,
            assignments: {
              include: { technician: true },
            },
          },
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
        items: true,
        request: {
          include: {
            customer: true,
            assignments: {
              include: { technician: true },
            },
          },
        },
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
      if (!assignment) {
        throw new NotFoundException(
          'الطلب غير موجود أو غير مسند إلى هذا الفني',
        );
      }
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
