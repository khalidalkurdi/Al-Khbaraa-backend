import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, RequestStatus } from '@prisma/client';

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.InvoiceCreateInput) {
    return this.prisma.invoice.create({
      data,
      include: {
        items: true,
        request: true,
        technician: true,
      },
    });
  }

  async findMany(params: {
    page: number;
    limit: number;
    requestId?: string;
    type?: string;
    status?: string;
    userId?: string;
    isTechnician?: boolean;
  }) {
    const { page, limit, requestId, type, status, userId, isTechnician } = params;
    const where: Prisma.InvoiceWhereInput = {};

    if (requestId) where.requestId = requestId;
    if (type) where.type = type as 'internal' | 'external';
    if (status) where.status = status;

    if (isTechnician && userId) {
      const assignments = await this.prisma.technicianAssignment.findMany({
        where: { technicianId: userId, isActive: true },
        select: { requestId: true },
      });
      const requestIds = assignments.map((a) => a.requestId);
      where.requestId = { in: requestIds };
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
          technician: {
            select: { id: true, fullName: true, email: true },
          },
          payments: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        request: {
          include: { customer: true },
        },
        technician: {
          select: { id: true, fullName: true, email: true },
        },
        payments: true,
      },
    });
  }

  async findByIdWithAuthorization(id: string, userId: string, isTechnician: boolean) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        request: true,
        items: true,
        payments: true,
        technician: true,
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
