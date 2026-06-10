import { Module } from '@nestjs/common';
import { TechnicianService } from './technician.service';
import { TechnicianController } from './technician.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [TechnicianController],
  providers: [TechnicianService],
  imports: [RealtimeModule, PrismaModule],
})
export class TechnicianModule {}
