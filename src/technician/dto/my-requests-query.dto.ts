import { IsOptional, IsEnum, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum TechnicianRequestStatusFilter {
  NEW = 'new',
  ACTIVE = 'active',
  COMPLETE = 'complete',
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

  @ApiPropertyOptional({
    example: false,
    required: false,
    description: 'User active status',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;

    return value;
  })
  @IsBoolean()
  isRepeated?: boolean = false;
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
