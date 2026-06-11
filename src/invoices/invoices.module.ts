import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceNumberUtil } from './utils/invoice-number.util';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository, InvoiceNumberUtil],
  imports: [PrismaModule, RealtimeModule, PdfModule],
  exports: [InvoicesService],
})
export class InvoicesModule {}
