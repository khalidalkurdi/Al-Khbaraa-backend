import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfModule } from '../pdf/pdf.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, PdfModule, FinanceModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
