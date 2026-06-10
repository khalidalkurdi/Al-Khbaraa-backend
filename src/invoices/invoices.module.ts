import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceNumberUtil } from './utils/invoice-number.util';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository, InvoiceNumberUtil],
  imports: [PrismaModule, RealtimeModule],
  exports: [InvoicesService],
})
export class InvoicesModule {}
