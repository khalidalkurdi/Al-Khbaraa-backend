import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { RequestStatus } from '@prisma/client';
import { Priority } from '@prisma/client';
import { RequestType } from '@prisma/client';

export class RequestQueryDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @MaxLength(10)
  startDate?: string;

  @IsOptional()
  @MaxLength(10)
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(10)
  limit: number = 10;

  @IsOptional()
  @MaxLength(100)
  search?: string;
}
