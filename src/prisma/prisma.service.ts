import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
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
