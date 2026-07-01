import { IsNumber, IsOptional, IsString, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SettlementType } from '@prisma/client';

export class CreatePayrollRecordDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  year: number;
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  month: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsEnum(SettlementType)
  type: SettlementType;
}
