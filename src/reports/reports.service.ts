import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus } from '@prisma/client';

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
    this.logger.log(
      `Generating requests report from ${startDate} to ${endDate}`,
    );

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
    let repeated: number = 0;

    for (const request of requests) {
      byStatus[request.status] = (byStatus[request.status] ?? 0) + 1;
      byType[request.type] = (byType[request.type] ?? 0) + 1;
      byPriority[request.priority] = (byPriority[request.priority] ?? 0) + 1;
      repeated += request.isRepeated ? 1 : 0;
    }

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      summary: {
        totalRequests: requests.length,
        withInvoice: requests.filter((r) => r.invoice).length,
        byStatus,
        byType,
        byPriority,
        repeated,
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
        inCompleted: number;
        inProgress: number;
        lost: number;
      }
    >();

    for (const tech of technicians) {
      byTechnician.set(tech.id, {
        assigned: 0,
        completed: 0,
        inCompleted: 0,
        inProgress: 0,
        lost: 0,
      });
    }

    for (const assignment of assignments) {
      const stat = byTechnician.get(assignment.technicianId);
      if (!stat) continue;

      stat.assigned += 1;

      if (assignment.request.status === RequestStatus.completed) {
        stat.completed += 1;
      } else if (assignment.request.status === RequestStatus.incompleted) {
        stat.inCompleted += 1;
      } else if (
        assignment.request.status === RequestStatus.cancelled ||
        assignment.request.status === RequestStatus.notanswer ||
        assignment.request.status === RequestStatus.notrepairable
      ) {
        stat.lost += 1;
      } else {
        stat.inProgress += 1;
      }
    }

    const technicianRows = technicians.map((tech) => {
      const stat = byTechnician.get(tech.id)!;
      const completionRate =
        stat.assigned > 0
          ? Number(
              (
                ((stat.completed + stat.inCompleted) / stat.assigned) *
                100
              ).toFixed(2),
            )
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
        acc.totalCancelled += row.lost;
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

    const byType: Record<string, { count: number; totalQuantity: number }> = {};

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

  async getFinancialReport(year: number, months: number[]) {
    this.logger.log(
      `Generating financial report for year ${year} months ${months.join(',')}`,
    );

    const startMonth = Math.min(...months);
    const endMonth = Math.max(...months);

    const periodStart = new Date(year, startMonth - 1, 1);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(year, endMonth, 0);
    periodEnd.setHours(23, 59, 59, 999);

    const [
      salariesResult,
      fixedExpensesResult,
      variableExpensesResult,
      partsCostsResult,
      payrollResult,
      paymentsForReport,
    ] = await Promise.all([
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
          OR: [{ year: year, month: { in: months } }],
        },
      }),
      this.prisma.$queryRaw<{ partsCost: number }[]>`
        SELECT COALESCE(SUM(i.total_cost), 0) AS partsCost
        FROM invoices i
        INNER JOIN payments p ON p.invoice_id = i.id
        WHERE p.paid_at >= ${periodStart} AND p.paid_at <= ${periodEnd}
          AND i.is_active = 1
          AND p.is_active = 1
      `,
      this.prisma.payrollRecord.aggregate({
        _sum: { amount: true },
        where: {
          year: year,
          month: { in: months },
          isActive: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          paidAt: { gte: periodStart, lte: periodEnd },
          isActive: true,
        },
        include: {
          invoice: {
            select: {
              totalAmount: true,
              totalCurrency: true,
            },
          },
        },
        orderBy: { paidAt: 'asc' },
      }),
    ]);

    let totalRevenuesSyp = 0;
    let totalSalesSyp = 0;
    const invoiceFirstPaymentRate = new Map<string, number>();
    const processedSalesInvoices = new Set<string>();

    for (const payment of paymentsForReport) {
      const amount = toDecimal(payment.amount);
      if (payment.currency === 'USD') {
        const rate = toDecimal(payment.dollarExchangeRate);
        totalRevenuesSyp += amount * rate;
      } else {
        totalRevenuesSyp += amount;
      }

      if (!invoiceFirstPaymentRate.has(payment.invoiceId)) {
        invoiceFirstPaymentRate.set(
          payment.invoiceId,
          toDecimal(payment.dollarExchangeRate),
        );
      }

      if (!processedSalesInvoices.has(payment.invoiceId)) {
        processedSalesInvoices.add(payment.invoiceId);
        const invoiceAmount = toDecimal(payment.invoice.totalAmount);
        if (payment.invoice.totalCurrency === 'USD') {
          const rate = toDecimal(payment.dollarExchangeRate);
          totalSalesSyp += invoiceAmount * rate;
        } else {
          totalSalesSyp += invoiceAmount;
        }
      }
    }

    const salariesSum = toDecimal(salariesResult._sum.salary);
    const fixedExpensesSum = toDecimal(fixedExpensesResult._sum.amount);
    const variableCosts = toDecimal(variableExpensesResult._sum.amount);
    const partsCosts = toDecimal(partsCostsResult[0]?.partsCost);
    const payrollAdjustment = toDecimal(payrollResult._sum.amount);

    const baseSalaryCost = salariesSum * months.length;
    const fixedCostsSyp = baseSalaryCost + fixedExpensesSum;
    const totalCosts =
      fixedCostsSyp + variableCosts + partsCosts + payrollAdjustment;
    const netProfitSyp = totalSalesSyp - totalCosts;

    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalSalesSyp: toFixed2(totalSalesSyp),
      totalRevenuesSyp: toFixed2(totalRevenuesSyp),
      fixedCostsSyp: toFixed2(fixedCostsSyp),
      variableCostsSyp: toFixed2(variableCosts),
      partsCostsSyp: toFixed2(partsCosts),
      netProfitSyp: toFixed2(netProfitSyp),
    };
  }
}
