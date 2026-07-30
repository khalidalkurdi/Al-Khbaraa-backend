import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // ✅ أضف هذا
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  Matches,
  IsNumber,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSparePartDto {
  @ApiProperty({
    example: 'شاشة iPhone 13 Pro',
    description: 'اسم قطعة الغيار',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم قطعة الغيار مطلوب' })
  @MaxLength(255, { message: 'اسم قطعة الغيار لا يتجاوز 255 حرفاً' })
  name: string;

  @ApiPropertyOptional({
    example: 'SCR-IP13-001',
    description: 'رمز التخزين (SKU) - فريد لتحديد القطعة',
    maxLength: 100,
    pattern: '^[a-zA-Z0-9\\-_]+$',
  })
  @IsOptional()
  @IsString()
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
  @IsString()
  @MaxLength(255, { message: 'موقع التخزين لا يتجاوز 255 حرفاً' })
  shelfLocation?: string;

  @ApiProperty({
    example: 25000,
    description: 'تكلفة القطعة بالليرة السورية',
    minimum: 1,
    type: 'integer',
  })
  @IsDefined({ message: 'القيمة بالليرة وبالدولار مطلوبين' })
  @IsNumber({}, { message: 'تكلفة الليرة السورية يجب أن تكون رقماً' })
  @IsInt({ message: 'تكلفة الليرة السورية يجب أن تكون عدداً صحيحاً' })
  @Min(1, { message: 'تكلفة القطعة بالليرة مطلوبة' })
  @Type(() => Number)
  costSyp: number;

  @ApiProperty({
    example: 7.14,
    description: 'تكلفة القطعة بالدولار الأمريكي',
    minimum: 1,
    type: 'number',
  })
  @IsDefined({ message: 'القيمة بالليرة وبالدولار مطلوبين' })
  @IsNumber({}, { message: 'تكلفة الدولار يجب أن تكون رقماً' })
  @Min(1, { message: 'تكلفة القطعة بالدولار مطلوبة' })
  @Type(() => Number)
  costUsd: number;
}
