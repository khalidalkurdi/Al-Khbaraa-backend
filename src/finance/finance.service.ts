import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

function buildExpenseMonthYearWhere(startMonth: number, startYear: number, endMonth: number, endYear: number) {
  if (startYear === endYear) {
    return {
      AND: [
        { year: startYear },
        { month: { gte: startMonth, lte: endMonth } },
      ],
    };
  }

  return {
    OR: [
      {
        AND: [
          { year: startYear },
          { month: { gte: startMonth } },
        ],
      },
      {
        AND: [
          { year: { gt: startYear, lt: endYear } } as any,
        ],
      },
      {
        AND: [
          { year: endYear },
          { month: { lte: endMonth } },
        ],
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
}): { id: string; type: string; name: string; amount: string; month?: number; year?: number; createdAt: string } {
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

  async createExpense(dto: CreateExpenseDto, user: { id: string; email: string; roles: string[] }) {
    this.logger.log(`User ${user.email} creating expense: ${dto.name} (${dto.type})`);
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

  async findExpenses(filters?: { type?: string; month?: string; year?: string }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.month !== undefined && filters.month !== undefined && filters.month !== '') {
      where.month = parseInt(filters.month, 10);
    }
    if (filters?.year !== undefined && filters.year !== undefined && filters.year !== '') {
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

  async getSummary(startDate: string, endDate: string): Promise<{ totalRevenues: string; fixedCosts: string; variableCosts: string; partsCosts: string; otherCosts: string; netProfit: string; periodStart: string; periodEnd: string }> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }

    this.logger.log(`Generating financial summary from ${startDate} to ${endDate}`);

    const startMonth = start.getMonth() + 1;
    const endMonth = end.getMonth() + 1;
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    const [revenuesResult, salariesResult, fixedExpensesResult, variableExpensesResult, otherExpensesResult, partsCostsResult] = await Promise.all([
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
          ...buildExpenseMonthYearWhere(startMonth, startYear, endMonth, endYear),
        },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          type: 'other',
          ...buildExpenseMonthYearWhere(startMonth, startYear, endMonth, endYear),
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
