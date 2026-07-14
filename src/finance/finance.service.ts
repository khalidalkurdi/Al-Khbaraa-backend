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
import { SettlementType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { getSyriaNow } from '../common/utils/syria-date.util';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  async getMonthlyDues(year: number, month: number) {
    this.logger.log(`Calculating monthly dues for ${year}-${month}`);

    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userNumber: true,
        fullName: true,
        profileImagePath: true,
        jobTitle: true,
        salary: true,
        role: {
          select: {
            name: true,
          },
        },
        payrollRecords: {
          where: {
            month,
            year,
            isActive: true,
          },
          select: {
            type: true,
            amount: true,
            note: true,
          },
        },
      },
    });

    const result: any[] = [];

    for (const user of users) {
      const salary = toDecimal(user.salary);
      let adjustments = 0;

      for (const record of user.payrollRecords) {
        const amount = toDecimal(record.amount);
        if (
          record.type === SettlementType.deduction ||
          record.type === SettlementType.salary
        ) {
          adjustments -= amount;
        } else {
          adjustments += amount;
        }
      }

      const monthlyDueAmount = salary + adjustments;

      let monthlyDue = await this.prisma.monthlyDues.findUnique({
        where: {
          userId_year_month: { userId: user.id, year, month },
        },
      });

      if (!monthlyDue) {
        monthlyDue = await this.prisma.monthlyDues.create({
          data: {
            userId: user.id,
            amount: monthlyDueAmount,
            year,
            month,
          },
        });
      } else {
        monthlyDue = await this.prisma.monthlyDues.update({
          where: { id: monthlyDue.id },
          data: { amount: monthlyDueAmount },
        });
      }

      result.push({
        userId: user.id,
        userNumber: user.userNumber,
        profileImagePath: user.profileImagePath,
        fullName: user.fullName,
        jobTitle: user.jobTitle,
        roleName: user.role.name,
        salary: toFixed2(salary),
        payrolls: user.payrollRecords.map((record) => ({
          type: record.type,
          amount: toFixed2(toDecimal(record.amount)),
          note: record.note,
        })),
        monthlyDue: toFixed2(monthlyDueAmount),
        monthlyDuesId: monthlyDue.id,
        isArrested: monthlyDue.isArrested,
        arrestedDate: monthlyDue.arrestedDate,
      });
    }

    return {
      year,
      month,
      users: result,
    };
  }

  async arrestMonthlyDue(id: string) {
    const monthlyDue = await this.prisma.monthlyDues.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!monthlyDue) {
      throw new NotFoundException(`المستحقات الشهرية بالمعرف ${id} غير موجودة`);
    }

    if (monthlyDue.isArrested) {
      return {
        message: 'هذه المستحقات الشهرية تم تسليمها مسبقاً',
        monthlyDue,
      };
    }

    const arrested = await this.prisma.monthlyDues.update({
      where: { id },
      data: {
        isArrested: true,
        arrestedDate: getSyriaNow(),
      },
    });

    if (monthlyDue.user.role.name === 'Technician') {
      void this.notificationsService
        .sendPushNotification({
          userId: monthlyDue.user.id,
          title: 'استلام المستحقات الشهرية',
          body: `لقد استلمت مستحقاتك للشهر الحالي ${monthlyDue.year} ${monthlyDue.month} والبالغة ${toFixed2(
            toDecimal(monthlyDue.amount),
          )} ل.س`,
        })
        .catch((error: any) => {
          this.logger.warn(`FCM push notification failed: ${error?.message}`);
        });
    }

    return arrested;
  }
}
