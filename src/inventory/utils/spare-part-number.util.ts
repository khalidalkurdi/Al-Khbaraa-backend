import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SparePartNumberUtil {
  constructor(private prisma: PrismaService) {}

  async generateUniqueSparePartNumber(): Promise<string> {
    const prefix = 'SP-';
    const sequence = await this.getNextSequence(prefix);
    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  private async getNextSequence(
    prefix: string,
    maxRetries = 10,
  ): Promise<number> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const count = await this.prisma.sparePart.count();
      const nextSeq = count + 1;
      const candidate = `${prefix}${String(nextSeq).padStart(6, '0')}`;

      const exists = await this.prisma.sparePart.findUnique({
        where: { sparePartNumber: candidate },
        select: { id: true },
      });

      if (!exists) {
        return nextSeq;
      }
    }

    throw new Error(
      'Failed to generate unique spare part number after maximum retries',
    );
  }
}