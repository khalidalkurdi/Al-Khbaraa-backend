import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceNumberUtil } from './utils/invoice-number.util';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { SettingsService } from 'src/settings/settings.service';

@Module({
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoicesRepository,
    InvoiceNumberUtil,
    SettingsService,
  ],
  imports: [PrismaModule, PaymentsModule, InventoryModule],
  exports: [InvoicesService],
})
export class InvoicesModule {}
