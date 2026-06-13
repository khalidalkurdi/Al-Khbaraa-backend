import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import type { FinancialReportPdfData } from '../pdf/pdf.types';

function buildExpenseMonthYearWhere(
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number,
) {
  if (startYear === endYear) {
    return {
      AND: [{ year: startYear }, { month: { gte: startMonth, lte: endMonth } }],
    };
  }

  return {
    OR: [
      {
        AND: [{ year: startYear }, { month: { gte: startMonth } }],
      },
      {
        AND: [{ year: { gt: startYear, lt: endYear } } as any],
      },
      {
        AND: [{ year: endYear }, { month: { lte: endMonth } }],
      },
    ],
  };
}

function toExpenseResponse(expense: {
  id: string;
  type: string;
  name: string;
  amount: any;
  month: number | null;
  year: number | null;
  createdAt: Date;
}): {
  id: string;
  type: string;
  name: string;
  amount: string;
  month?: number;
  year?: number;
  createdAt: string;
} {
  return {
    id: expense.id,
    type: expense.type,
    name: expense.name,
    amount: expense.amount.toString(),
    month: expense.month ?? undefined,
    year: expense.year ?? undefined,
    createdAt: expense.createdAt.toISOString(),
  };
}

function toDecimal(value: any): number {
  if (!value) return 0;
  return parseFloat(value.toString());
}

function toFixed2(value: number): string {
  return value.toFixed(2);
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createExpense(
    dto: CreateExpenseDto,
    user: { id: string; email: string; roles: string[] },
  ) {
    this.logger.log(
      `User ${user.email} creating expense: ${dto.name} (${dto.type})`,
    );
    const expense = await this.prisma.expense.create({
      data: {
        type: dto.type,
        name: dto.name,
        amount: dto.amount,
        month: dto.month ?? null,
        year: dto.year ?? null,
      },
    });
    return toExpenseResponse(expense);
  }

  async findExpenses(filters?: {
    type?: string;
    month?: string;
    year?: string;
  }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }
    if (
      filters?.month !== undefined &&
      filters.month !== undefined &&
      filters.month !== ''
    ) {
      where.month = parseInt(filters.month, 10);
    }
    if (
      filters?.year !== undefined &&
      filters.year !== undefined &&
      filters.year !== ''
    ) {
      where.year = parseInt(filters.year, 10);
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return expenses.map(toExpenseResponse);
  }

  async findExpenseById(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return toExpenseResponse(expense);
  }

  async updateExpense(id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    const data: any = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.month !== undefined) data.month = dto.month;
    if (dto.year !== undefined) data.year = dto.year;

    const updated = await this.prisma.expense.update({
      where: { id },
      data,
    });

    return toExpenseResponse(updated);
  }

  async deleteExpense(id: string) {
    const existing = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    await this.prisma.expense.delete({
      where: { id },
    });
  }

  async getFinancialReportPdfData(
    startDate: string,
    endDate: string,
  ): Promise<FinancialReportPdfData> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const endExclusive = new Date(endDate);
    endExclusive.setHours(0, 0, 0, 0);
    endExclusive.setDate(endExclusive.getDate() + 1);

    if (Number.isNaN(start.getTime()) || Number.isNaN(endExclusive.getTime())) {
      throw new BadRequestException(
        'startDate and endDate must be valid dates',
      );
    }

    if (start > endExclusive) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    this.logger.log(
      `Generating financial PDF report from ${startDate} to ${endDate}`,
    );

    const startMonth = start.getMonth() + 1;
    const endMonth = endExclusive.getMonth() + 1;
    const startYear = start.getFullYear();
    const endYear = endExclusive.getFullYear();

    const [
      paymentsInPeriod,
      salariesResult,
      fixedExpensesResult,
      variableExpensesResult,
      otherExpensesResult,
    ] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          paidAt: {
            gte: start,
            lt: endExclusive,
          },
        },
        include: {
          invoice: {
            include: {
              items: {
                include: {
                  sparePart: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.aggregate({
        _sum: { salary: true },
        where: { isActive: true },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          type: 'fixed',
          OR: [
            { month: null, year: null },
            buildExpenseMonthYearWhere(
              startMonth,
              startYear,
              endMonth,
              endYear,
            ),
          ],
        },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          type: 'variable',
          ...buildExpenseMonthYearWhere(
            startMonth,
            startYear,
            endMonth,
            endYear,
          ),
        },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          type: 'other',
          ...buildExpenseMonthYearWhere(
            startMonth,
            startYear,
            endMonth,
            endYear,
          ),
        },
      }),
    ]);

    const totalRevenues = paymentsInPeriod.reduce(
      (sum, payment) => sum + toDecimal(payment.convertedAmount),
      0,
    );

    const invoiceIds = Array.from(
      new Set(paymentsInPeriod.map((payment) => payment.invoiceId)),
    );
    const allPaymentsByInvoice = await this.prisma.payment.findMany({
      where: {
        invoiceId: { in: invoiceIds },
      },
      select: {
        invoiceId: true,
        convertedAmount: true,
      },
    });

    const totalConvertedByInvoice = new Map<string, number>();
    for (const payment of allPaymentsByInvoice) {
      totalConvertedByInvoice.set(
        payment.invoiceId,
        (totalConvertedByInvoice.get(payment.invoiceId) ?? 0) +
          toDecimal(payment.convertedAmount),
      );
    }

    const partsCostByInvoice = new Map<string, number>();
    for (const payment of paymentsInPeriod) {
      if (partsCostByInvoice.has(payment.invoiceId)) {
        continue;
      }

      const partsCost = payment.invoice.items.reduce(
        (sum, item) => sum + toDecimal(item.sparePart.costSyp) * item.quantity,
        0,
      );
      partsCostByInvoice.set(payment.invoiceId, partsCost);
    }

    const partsCosts = paymentsInPeriod.reduce((sum, payment) => {
      const invoiceTotal = totalConvertedByInvoice.get(payment.invoiceId) ?? 0;
      if (invoiceTotal <= 0) {
        return sum;
      }

      const invoicePartsCost = partsCostByInvoice.get(payment.invoiceId) ?? 0;
      return (
        sum +
        invoicePartsCost * (toDecimal(payment.convertedAmount) / invoiceTotal)
      );
    }, 0);

    const fixedCosts =
      toDecimal(salariesResult._sum.salary) +
      toDecimal(fixedExpensesResult._sum.amount);
    const variableCosts = toDecimal(variableExpensesResult._sum.amount);
    const otherCosts = toDecimal(otherExpensesResult._sum.amount);
    const totalCosts = fixedCosts + variableCosts + partsCosts + otherCosts;
    const netProfit = totalRevenues - totalCosts;

    return {
      periodStart: start.toISOString(),
      periodEnd: endExclusive.toISOString(),
      totalRevenues: toFixed2(totalRevenues),
      fixedCosts: toFixed2(fixedCosts),
      variableCosts: toFixed2(variableCosts),
      partsCosts: toFixed2(partsCosts),
      otherCosts: toFixed2(otherCosts),
      netProfit: toFixed2(netProfit),
      assumptions: [
        'Revenue is calculated from Payment.convertedAmount using payment date.',
        'Parts costs use current SparePart.costSyp and are allocated proportionally to payments received in the period.',
        'Fixed costs include active user salaries and fixed expenses assigned to the period.',
        'All report totals are displayed in SYP.',
      ],
    };
  }

  async getSummary(
    startDate: string,
    endDate: string,
  ): Promise<{
    totalRevenues: string;
    fixedCosts: string;
    variableCosts: string;
    partsCosts: string;
    otherCosts: string;
    netProfit: string;
    periodStart: string;
    periodEnd: string;
  }> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    this.logger.log(
      `Generating financial summary from ${startDate} to ${endDate}`,
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
      otherExpensesResult,
      partsCostsResult,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { convertedAmount: true },
        where: {
          paidAt: { gte: start, lte: end },
        },
      }),
      this.prisma.user.aggregate({
        _sum: { salary: true },
        where: { isActive: true },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { type: 'fixed' },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          type: 'variable',
          ...buildExpenseMonthYearWhere(
            startMonth,
            startYear,
            endMonth,
            endYear,
          ),
        },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          type: 'other',
          ...buildExpenseMonthYearWhere(
            startMonth,
            startYear,
            endMonth,
            endYear,
          ),
        },
      }),
      this.prisma.$queryRaw<{ partsCost: number }[]>`
        SELECT COALESCE(SUM(si.cost_syp * ii.quantity), 0) AS partsCost
        FROM invoice_items ii
        INNER JOIN invoices i ON ii.invoice_id = i.id
        INNER JOIN spare_parts si ON ii.spare_part_id = si.id
        INNER JOIN payments p ON p.invoice_id = i.id
        WHERE p.paid_at >= ${start} AND p.paid_at <= ${end}
      `,
    ]);

    const totalRevenues = toDecimal(revenuesResult._sum.convertedAmount);
    const salariesSum = toDecimal(salariesResult._sum.salary);
    const fixedExpensesSum = toDecimal(fixedExpensesResult._sum.amount);
    const variableCosts = toDecimal(variableExpensesResult._sum.amount);
    const otherCosts = toDecimal(otherExpensesResult._sum.amount);
    const partsCosts = toDecimal(partsCostsResult[0]?.partsCost);

    const fixedCosts = salariesSum + fixedExpensesSum;
    const totalCosts = fixedCosts + variableCosts + partsCosts + otherCosts;
    const netProfit = totalRevenues - totalCosts;

    return {
      totalRevenues: toFixed2(totalRevenues),
      fixedCosts: toFixed2(fixedCosts),
      variableCosts: toFixed2(variableCosts),
      partsCosts: toFixed2(partsCosts),
      otherCosts: toFixed2(otherCosts),
      netProfit: toFixed2(netProfit),
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };
  }
}
