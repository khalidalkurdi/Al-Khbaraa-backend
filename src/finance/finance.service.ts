import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { omitEmpty } from '../common/utils/object.util';

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
    return expense;
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
      where: { ...where, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return expenses;
  }

  async findExpenseById(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException(`مصروف بالمعرف ${id} غير موجود`);
    }

    return expense;
  }

  async updateExpense(id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`مصروف بالمعرف ${id} غير موجود`);
    }

    const data: any = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.month !== undefined) data.month = dto.month;
    if (dto.year !== undefined) data.year = dto.year;

    const cleanedData = omitEmpty(data);

    if (Object.keys(cleanedData).length === 0) {
      return existing;
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: cleanedData,
    });

    return updated;
  }

  async deleteExpense(id: string) {
    const existing = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`مصروف بالمعرف ${id} غير موجود`);
    }

    await this.prisma.expense.delete({
      where: { id },
    });
  }

  async getSalesProfits(date: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException(
        'التاريخ غير صالح. يجب أن يكون بصيغة YYYY-MM-DD',
      );
    }

    this.logger.log(`Generating sales profits report for date ${date}`);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: 'refunded' },
        isActive: true,
      },
      include: {
        payments: {
          where: { isActive: true },
          orderBy: { paidAt: 'asc' },
        },
      },
    });

    let totalSales = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalPartsCost = 0;
    let netProfit = 0;

    for (const invoice of invoices) {
      const firstPayment = invoice.payments[0];
      const rate = firstPayment
        ? toDecimal(firstPayment.dollarExchangeRate)
        : 0;

      const toSyp = (value: any) =>
        invoice.totalCurrency === 'USD'
          ? toDecimal(value) * rate
          : toDecimal(value);

      totalSales += toSyp(invoice.totalAmount);
      totalRemaining += toSyp(invoice.remainingAmount);
      netProfit += toSyp(invoice.netProfit);
      totalPartsCost += toDecimal(invoice.totalCostSyp);

      for (const payment of invoice.payments) {
        const paidInSyp =
          payment.currency === 'USD'
            ? toDecimal(payment.convertedAmount)
            : toDecimal(payment.amount);
        totalPaid += paidInSyp;
      }
    }

    return {
      date: start.toISOString(),
      totalSales: toFixed2(totalSales),
      totalPaid: toFixed2(totalPaid),
      totalRemaining: toFixed2(totalRemaining),
      totalPartsCost: toFixed2(totalPartsCost),
      netProfit: toFixed2(netProfit),
      invoiceCount: invoices.length,
    };
  }

  async getSummary(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      throw new BadRequestException(
        'يجب أن يكون startDate قبل أو يساوي endDate',
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
      totalRevenues: toFixed2(totalRevenues),
      fixedCosts: toFixed2(fixedCosts),
      variableCosts: toFixed2(variableCosts),
      partsCosts: toFixed2(partsCosts),
      netProfit: toFixed2(netProfit),
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };
  }
}
