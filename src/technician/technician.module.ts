import { Module } from '@nestjs/common';
import { TechnicianService } from './technician.service';
import { TechnicianController } from './technician.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [TechnicianController],
  providers: [TechnicianService],
  imports: [PrismaModule],
})
export class TechnicianModule {}
