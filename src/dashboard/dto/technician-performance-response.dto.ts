import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TechnicianPerformanceTimelineDto {
  @ApiProperty({ description: 'Request ID', format: 'uuid' })
  requestId: string;

  @ApiProperty({ description: 'Request number' })
  requestNumber: string;

  @ApiProperty({ description: 'Current request status' })
  status: string;

  @ApiPropertyOptional({
    description:
      'Maintenance time in minutes (from underrepair to completion/incompletion/pulltocenter)',
    type: Number,
    nullable: true,
  })
  maintenanceTime: number | null;

  @ApiPropertyOptional({
    description:
      'Completion time in minutes (from journey start to invoice creation)',
    type: Number,
    nullable: true,
  })
  completionTime: number | null;

  @ApiPropertyOptional({
    description: 'Journey start time (status changed to ontheway)',
    type: Date,
    format: 'date-time',
    nullable: true,
  })
  startTime: Date | null;

  @ApiPropertyOptional({
    description: 'Invoice creation time (end time)',
    type: Date,
    format: 'date-time',
    nullable: true,
  })
  endTime: Date | null;
}

export class TechnicianPerformanceDetailDto {
  @ApiProperty({ description: 'Technician ID', format: 'uuid' })
  technicianId: string;

  @ApiProperty({ description: 'Technician full name' })
  technicianName: string;

  @ApiProperty({ description: 'User number' })
  userNumber: string;

  @ApiProperty({ description: 'Completed requests count today' })
  completedCount: number;

  @ApiProperty({ description: 'Incompleted requests count today' })
  incompletedCount: number;

  @ApiProperty({ description: 'Active requests count today' })
  activeCount: number;

  @ApiProperty({ description: 'Pull to center requests count today' })
  pulltocenterCount: number;

  @ApiProperty({
    description: 'Timeline details for each request',
    type: [TechnicianPerformanceTimelineDto],
  })
  @Type(() => TechnicianPerformanceTimelineDto)
  timeline: TechnicianPerformanceTimelineDto[];

  @ApiProperty({ description: 'Total payments in SYP', type: Number })
  paymentsSyp: number;

  @ApiProperty({ description: 'Total payments in USD', type: Number })
  paymentsUsd: number;

  @ApiProperty({
    description: 'Total sales (sum of invoice amounts)',
    type: Number,
  })
  sales: number;
}

export class TechnicianPerformanceOverallDto {
  @ApiProperty({
    description: 'Completed requests count today (all technicians)',
  })
  completedToday: number;

  @ApiProperty({
    description: 'Incompleted requests count today (all technicians)',
  })
  incompletedToday: number;

  @ApiProperty({
    description: 'Pull to center requests count today (all technicians)',
  })
  pulltocenterToday: number;

  @ApiProperty({ description: 'Active requests count today (all technicians)' })
  activeToday: number;

  @ApiProperty({ description: 'Total payments in SYP today', type: Number })
  paymentsSypToday: number;

  @ApiProperty({ description: 'Total payments in USD today', type: Number })
  paymentsUsdToday: number;
}

export class TechnicianPerformanceResponseDto {
  @ApiProperty({
    description: 'Overall summary for today',
    type: TechnicianPerformanceOverallDto,
  })
  overall: TechnicianPerformanceOverallDto;

  @ApiProperty({
    description: 'Per technician breakdown',
    type: [TechnicianPerformanceDetailDto],
  })
  @Type(() => TechnicianPerformanceDetailDto)
  technicians: TechnicianPerformanceDetailDto[];
}
