import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserNumberUtil {
  constructor(private prisma: PrismaService) {}

  async generateUniqueUserNumber(): Promise<string> {
    const prefix = 'USER-';
    const sequence = await this.getNextSequence(prefix);
    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  private async getNextSequence(
    prefix: string,
    maxRetries = 10,
  ): Promise<number> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const count = await this.prisma.user.count();
      const nextSeq = count + 1;
      const candidate = `${prefix}${String(nextSeq).padStart(6, '0')}`;

      const exists = await this.prisma.user.findUnique({
        where: { userNumber: candidate },
        select: { id: true },
      });

      if (!exists) {
        return nextSeq;
      }
    }

    throw new Error(
      'Failed to generate unique user number after maximum retries',
    );
  }
}
