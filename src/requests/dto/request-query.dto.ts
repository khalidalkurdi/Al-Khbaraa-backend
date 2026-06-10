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
  scheduledDate?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
