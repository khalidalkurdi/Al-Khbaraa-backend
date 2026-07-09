import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toDecimal(value: any): number {
  if (!value) return 0;
  return parseFloat(value.toString());
}

function toFixed2(value: number): string {
  return value.toFixed(2);
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private parseRange(startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('تواريخ غير صالحة');
    }

    if (start > end) {
      throw new BadRequestException(
        'يجب أن يكون startDate قبل أو يساوي endDate',
      );
    }

    return { start, end };
  }

  async getRequestsReport(startDate: string, endDate: string) {
    const { start, end } = this.parseRange(startDate, endDate);
    this.logger.log(`Generating requests report from ${startDate} to ${endDate}`);

    const requests = await this.prisma.request.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        isActive: true,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            firstPhone: true,
          },
        },
        assignments: {
          where: { isActive: true },
          include: {
            technician: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            totalAmount: true,
            totalCurrency: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const request of requests) {
      byStatus[request.status] = (byStatus[request.status] ?? 0) + 1;
      byType[request.type] = (byType[request.type] ?? 0) + 1;
      byPriority[request.priority] = (byPriority[request.priority] ?? 0) + 1;
    }

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      summary: {
        totalRequests: requests.length,
        completedRequests: requests.filter((r) => r.status === 'completed').length,
        cancelledRequests: requests.filter((r) => r.status === 'cancelled').length,
        withInvoice: requests.filter((r) => r.invoice).length,
        byStatus,
        byType,
        byPriority,
      },
      requests: requests.map((request) => ({
        id: request.id,
        requestNumber: request.requestNumber,
        type: request.type,
        status: request.status,
        priority: request.priority,
        faultDescription: request.faultDescription,
        isCompleted: request.isCompleted,
        hasInvoice: request.hasInvoice,
        createdAt: request.createdAt,
        customer: {
          id: request.customer.id,
          name: request.customer.name,
          firstPhone: request.customer.firstPhone,
        },
        technicians: request.assignments.map((a) => ({
          id: a.technician.id,
          fullName: a.technician.fullName,
          assignedAt: a.assignedAt,
        })),
        invoice: request.invoice
          ? {
              id: request.invoice.id,
              totalAmount: Number(request.invoice.totalAmount),
              totalCurrency: request.invoice.totalCurrency,
              status: request.invoice.status,
            }
          : null,
      })),
    };
  }

  async getTechniciansReport(startDate: string, endDate: string) {
    const { start, end } = this.parseRange(startDate, endDate);
    this.logger.log(
      `Generating technicians report from ${startDate} to ${endDate}`,
    );

    const technicians = await this.prisma.user.findMany({
      where: {
        role: { name: 'Technician' },
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        userNumber: true,
        phone: true,
      },
    });

    const assignments = await this.prisma.technicianAssignment.findMany({
      where: {
        assignedAt: { gte: start, lte: end },
        isActive: true,
      },
      include: {
        request: {
          select: {
            status: true,
            isCompleted: true,
          },
        },
      },
    });

    const byTechnician = new Map<
      string,
      {
        assigned: number;
        completed: number;
        inProgress: number;
        cancelled: number;
      }
    >();

    for (const tech of technicians) {
      byTechnician.set(tech.id, {
        assigned: 0,
        completed: 0,
        inProgress: 0,
        cancelled: 0,
      });
    }

    for (const assignment of assignments) {
      const stat = byTechnician.get(assignment.technicianId);
      if (!stat) continue;

      stat.assigned += 1;

      if (assignment.request.status === 'completed') {
        stat.completed += 1;
      } else if (assignment.request.status === 'cancelled') {
        stat.cancelled += 1;
      } else {
        stat.inProgress += 1;
      }
    }

    const technicianRows = technicians.map((tech) => {
      const stat = byTechnician.get(tech.id)!;
      const completionRate =
        stat.assigned > 0
          ? Number(((stat.completed / stat.assigned) * 100).toFixed(2))
          : 0;

      return {
        id: tech.id,
        fullName: tech.fullName,
        userNumber: tech.userNumber,
        phone: tech.phone,
        ...stat,
        completionRate,
      };
    });

    const totals = technicianRows.reduce(
      (acc, row) => {
        acc.totalAssigned += row.assigned;
        acc.totalCompleted += row.completed;
        acc.totalInProgress += row.inProgress;
        acc.totalCancelled += row.cancelled;
        return acc;
      },
      {
        totalAssigned: 0,
        totalCompleted: 0,
        totalInProgress: 0,
        totalCancelled: 0,
      },
    );

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      summary: {
        technicianCount: technicians.length,
        ...totals,
      },
      technicians: technicianRows,
    };
  }

  async getInventoryMovementsReport(startDate: string, endDate: string) {
    const { start, end } = this.parseRange(startDate, endDate);
    this.logger.log(
      `Generating inventory movements report from ${startDate} to ${endDate}`,
    );

    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        movementDate: { gte: start, lte: end },
        isActive: true,
      },
      include: {
        part: {
          select: {
            id: true,
            name: true,
            sparePartNumber: true,
          },
        },
        responsible: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { movementDate: 'desc' },
    });

    const byType: Record<
      string,
      { count: number; totalQuantity: number }
    > = {};

    for (const movement of movements) {
      if (!byType[movement.movementType]) {
        byType[movement.movementType] = { count: 0, totalQuantity: 0 };
      }
      byType[movement.movementType].count += 1;
      byType[movement.movementType].totalQuantity += movement.quantity;
    }

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      summary: {
        totalMovements: movements.length,
        byType,
      },
      movements: movements.map((movement) => ({
        id: movement.id,
        movementNo: movement.movementNo,
        movementType: movement.movementType,
        quantity: movement.quantity,
        reference: movement.reference ?? undefined,
        movementDate: movement.movementDate,
        part: {
          id: movement.part.id,
          name: movement.part.name,
          sparePartNumber: movement.part.sparePartNumber,
        },
        responsible: movement.responsible
          ? {
              id: movement.responsible.id,
              fullName: movement.responsible.fullName,
            }
          : null,
      })),
    };
  }

  async getFinancialReport(startDate: string, endDate: string) {
    const { start, end } = this.parseRange(startDate, endDate);
    this.logger.log(
      `Generating financial report from ${startDate} to ${endDate}`,
    );

    const startMonth = start.getMonth() + 1;
    const endMonth = end.getMonth() + 1;
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    const [
      revenuesResult,
      salariesResult,
      fixedExpensesResult,
      variableExpensesResult,
      partsCostsResult,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { convertedAmount: true },
        where: {
          paidAt: { gte: start, lte: end },
          isActive: true,
        },
      }),
      this.prisma.user.aggregate({
        _sum: { salary: true },
        where: { isActive: true },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { type: 'fixed', isActive: true },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          type: 'variable',
          isActive: true,
          OR: [
            { month: null, year: null },
            {
              OR: [
                {
                  AND: [
                    { year: startYear },
                    { month: { gte: startMonth } },
                  ],
                },
                {
                  AND: [
                    { year: { gt: startYear, lt: endYear } },
                  ] as any,
                },
                {
                  AND: [{ year: endYear }, { month: { lte: endMonth } }],
                },
              ],
            },
          ],
        },
      }),
      this.prisma.$queryRaw<{ partsCost: number }[]>`
        SELECT COALESCE(SUM(si.cost_syp * ii.quantity), 0) AS partsCost
        FROM invoice_items ii
        INNER JOIN invoices i ON ii.invoice_id = i.id
        INNER JOIN spare_parts si ON ii.spare_part_id = si.id
        INNER JOIN payments p ON p.invoice_id = i.id
        WHERE p.paid_at >= ${start} AND p.paid_at <= ${end}
          AND i.is_active = 1
          AND ii.is_active = 1
          AND p.is_active = 1
      `,
    ]);

    const totalRevenues = toDecimal(revenuesResult._sum.convertedAmount);
    const salariesSum = toDecimal(salariesResult._sum.salary);
    const fixedExpensesSum = toDecimal(fixedExpensesResult._sum.amount);
    const variableCosts = toDecimal(variableExpensesResult._sum.amount);
    const partsCosts = toDecimal(partsCostsResult[0]?.partsCost);

    const fixedCosts = salariesSum + fixedExpensesSum;
    const totalCosts = fixedCosts + variableCosts + partsCosts;
    const netProfit = totalRevenues - totalCosts;

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      totalRevenues: toFixed2(totalRevenues),
      fixedCosts: toFixed2(fixedCosts),
      variableCosts: toFixed2(variableCosts),
      partsCosts: toFixed2(partsCosts),
      netProfit: toFixed2(netProfit),
    };
  }
}
