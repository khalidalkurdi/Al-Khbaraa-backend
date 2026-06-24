import { IsOptional, IsEnum, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum TechnicianRequestStatusFilter {
  NEW = 'new',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  INCOMPLETED = 'incompleted',
  REPEATED = 'repeated',
  PULL_TO_CENTER = 'pull_to_center',
}

export class MyRequestsQueryDto {
  @ApiPropertyOptional({
    enum: TechnicianRequestStatusFilter,
    description: 'Filter by status category',
  })
  @IsOptional()
  @IsEnum(TechnicianRequestStatusFilter)
  status?: TechnicianRequestStatusFilter;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
