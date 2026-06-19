import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Set default transaction timeout globally
      transactionOptions: {
        timeout: 10000, // 10 seconds timeout
      },
    });
  }
  async onModuleInit() {
    await this.$connect();
    await this.$executeRawUnsafe(`SET time_zone = '+03:00'`);
    this.logger.log('Prisma connected with Syria timezone (+03:00)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async getCenterSettings() {
    return this.centerSettings.findFirst();
  }

  async upsertCenterSettings(data: Prisma.CenterSettingsUpsertArgs) {
    return this.centerSettings.upsert(data);
  }

  async updateCenterSettings(
    where: Prisma.CenterSettingsWhereUniqueInput,
    data: Prisma.CenterSettingsUpdateInput,
  ) {
    return this.centerSettings.update({ where, data });
  }
}
