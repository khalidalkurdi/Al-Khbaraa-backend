import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementType } from '@prisma/client';

export interface PayrollRecordFilters {
  userId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PayrollRecordsService {
  private readonly logger = new Logger(PayrollRecordsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPayrollRecord(
    dto: {
      userId: string;
      amount: number;
      note?: string;
      type: SettlementType;
    },
    user: { id: string; email: string; roles: string[] },
  ) {
    this.logger.log(
      `User ${user.email} creating payroll record for user ${dto.userId}`,
    );

    const payrollRecord = await this.prisma.payrollRecord.create({
      data: {
        userId: dto.userId,
        amount: dto.amount,
        note: dto.note,
        type: dto.type,
      },
    });

    return payrollRecord;
  }

  async findAll(filters?: PayrollRecordFilters) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.payrollRecord.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              fullName: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.payrollRecord.count(),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deletePayrollRecord(id: string) {
    const existing = await this.prisma.payrollRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`سجل راتب بالمعرف ${id} غير موجود`);
    }

    await this.prisma.payrollRecord.delete({
      where: { id },
    });
  }
}
