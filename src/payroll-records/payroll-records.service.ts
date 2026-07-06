import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollRecordsQueryDto } from './dto/payroll-records-query.dto';

@Injectable()
export class PayrollRecordsService {
  private readonly logger = new Logger(PayrollRecordsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPayrollRecord(createPayrollRecorddto) {
    const dto = createPayrollRecorddto;

    const payrollRecord = await this.prisma.payrollRecord.create({
      data: {
        userId: dto.userId,
        year: dto.year,
        month: dto.month,
        amount: dto.amount,
        note: dto.note,
        type: dto.type,
      },
    });

    return payrollRecord;
  }

  async findAll(filters?: PayrollRecordsQueryDto) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.year !== undefined) {
      where.year = filters.year;
    }

    if (filters?.month !== undefined) {
      where.month = filters.month;
    }

    if (filters?.search) {
      where.user = {
        OR: [
          { userNumber: { contains: filters.search } },
          { fullName: { contains: filters.search } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.payrollRecord.findMany({
        where: { ...where, isActive: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              fullName: true,
              userNumber: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.payrollRecord.count({ where: { ...where, isActive: true } }),
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
