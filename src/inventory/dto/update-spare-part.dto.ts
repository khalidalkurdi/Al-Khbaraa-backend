import { ApiPropertyOptional } from '@nestjs/swagger'; // ✅ أضف هذا
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsNumber,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSparePartDto {
  @ApiPropertyOptional({
    example: 'شاشة iPhone 13 Pro - جديد',
    description: 'اسم قطعة الغيار',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @MaxLength(255, { message: 'اسم قطعة الغيار لا يتجاوز 255 حرفاً' })
  name?: string;

  @ApiPropertyOptional({
    example: 'SCR-IP13-001',
    description: 'رمز التخزين (SKU) - فريد لتحديد القطعة',
    maxLength: 100,
    pattern: '^[a-zA-Z0-9\\-_]+$',
  })
  @IsOptional()
  @IsString({ message: 'رمز التخزين يجب أن يكون نصاً' })
  @MaxLength(100, { message: 'رمز التخزين لا يتجاوز 100 حرف' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'يجب أن يتكون رمز التخزين من حروف وأرقام فقط (يسمح بالشرطة والشرطة السفلية)',
  })
  sku?: string;

  @ApiPropertyOptional({
    example: 'رف 3 - صف 2 - مكان 1',
    description: 'موقع القطعة في المخزن',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'موقع التخزين يجب أن يكون نصاً' })
  @MaxLength(255, { message: 'موقع التخزين لا يتجاوز 255 حرفاً' })
  shelfLocation?: string;

  @ApiPropertyOptional({
    example: 25000,
    description: 'تكلفة القطعة بالليرة السورية',
    minimum: 0,
    type: 'integer',
  })
  @IsOptional()
  @IsNumber({}, { message: 'تكلفة الليرة السورية يجب أن تكون رقماً' })
  @IsInt({ message: 'تكلفة الليرة السورية يجب أن تكون عدداً صحيحاً' })
  @Min(0, { message: 'تكلفة الليرة السورية يجب أن تكون أكبر من أو تساوي 0' })
  @Type(() => Number)
  costSyp?: number;

  @ApiPropertyOptional({
    example: 7.14,
    description: 'تكلفة القطعة بالدولار الأمريكي',
    minimum: 0,
    type: 'number',
  })
  @IsOptional()
  @IsNumber({}, { message: 'تكلفة الدولار يجب أن تكون رقماً' })
  @Min(0, { message: 'تكلفة الدولار يجب أن تكون أكبر من أو تساوي 0' })
  @Type(() => Number)
  costUsd?: number;
}
