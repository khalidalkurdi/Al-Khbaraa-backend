import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RequestNumberUtil {
  constructor(private prisma: PrismaService) {}

  async generateUniqueRequestNumber(): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    const prefix = `REQ-${dateStr}-`;

    const sequence = await this.getNextSequence(prefix);
    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  private async getNextSequence(
    prefix: string,
    maxRetries = 10,
  ): Promise<number> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const count = await this.prisma.request.count({
        where: {
          requestNumber: {
            startsWith: prefix,
          },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const nextSeq = count + 1;
      const candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;

      const exists = await this.prisma.request.findUnique({
        where: { requestNumber: candidate },
        select: { id: true },
      });

      if (!exists) {
        return nextSeq;
      }
    }

    throw new Error('فشل إنشاء رقم طلب فريد بعد الحد الأقصى للمحاولات');
  }
}
