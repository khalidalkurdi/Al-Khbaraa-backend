import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  imports: [PrismaModule],
  exports: [PaymentsService],
})
export class PaymentsModule {}
