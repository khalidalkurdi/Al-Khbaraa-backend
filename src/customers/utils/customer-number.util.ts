import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerNumberUtil {
  constructor(private prisma: PrismaService) {}

  async generateUniqueCustomerNumber(): Promise<string> {
    const prefix = 'CUST-';
    const sequence = await this.getNextSequence(prefix);
    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  private async getNextSequence(
    prefix: string,
    maxRetries = 10,
  ): Promise<number> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const count = await this.prisma.customer.count();
      const nextSeq = count + 1;
      const candidate = `${prefix}${String(nextSeq).padStart(6, '0')}`;

      const exists = await this.prisma.customer.findUnique({
        where: { customerNumber: candidate },
        select: { id: true },
      });

      if (!exists) {
        return nextSeq;
      }
    }

    throw new Error('فشل إنشاء رقم عميل فريد بعد الحد الأقصى للمحاولات');
  }
}
