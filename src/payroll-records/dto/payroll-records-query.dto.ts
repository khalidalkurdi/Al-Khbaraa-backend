import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsNumber,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SettlementType } from '@prisma/client';

export class PayrollRecordsQueryDto {
  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'رقم الصفحة يجب أن يكون رقماً' })
  @Min(1, { message: 'رقم الصفحة يجب أن يكون أكبر من أو يساوي 1' })
  page: number = 1;

  @ApiPropertyOptional({
    description: 'عدد العناصر في الصفحة الواحدة',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'عدد العناصر يجب أن يكون رقماً' })
  @Min(1, { message: 'عدد العناصر يجب أن يكون أكبر من أو يساوي 1' })
  @Max(100, { message: 'عدد العناصر يجب أن يكون أقل من أو يساوي 100' })
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'نوع التسوية',
    enum: SettlementType,
    enumName: 'SettlementType',
    example: 'salary',
  })
  @IsOptional()
  @IsEnum(SettlementType, { message: 'نوع تسوية غير صالح' })
  type?: SettlementType;

  @ApiPropertyOptional({
    description: 'السنة المالية للتصفية',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'السنة يجب أن تكون رقماً' })
  @Min(2000, { message: 'السنة يجب أن تكون أكبر من أو تساوي 2000' })
  @Max(2100, { message: 'السنة يجب أن تكون أقل من أو تساوي 2100' })
  year?: number;

  @ApiPropertyOptional({
    description: 'الشهر (1-12) للتصفية',
    example: 6,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'الشهر يجب أن يكون رقماً' })
  @Min(1, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Max(12, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  month?: number;

  @ApiPropertyOptional({
    example: '123456 أحمد',
    description: 'بحث في رقم المستخدم أو اسم المستخدم',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'البحث يجب أن يكون نصاً' })
  @MaxLength(100, { message: 'البحث لا يتجاوز 100 حرف' })
  search?: string;
}
