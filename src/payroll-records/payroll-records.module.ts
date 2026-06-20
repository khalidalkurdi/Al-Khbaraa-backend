import { Module } from '@nestjs/common';
import { PayrollRecordsController } from './payroll-records.controller';
import { PayrollRecordsService } from './payroll-records.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PayrollRecordsController],
  providers: [PayrollRecordsService],
  exports: [PayrollRecordsService],
})
export class PayrollRecordsModule {}
