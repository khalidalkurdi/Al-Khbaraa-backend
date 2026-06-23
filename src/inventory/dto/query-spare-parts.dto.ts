import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // ✅ أضف هذا
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySparePartsDto {
  @ApiPropertyOptional({
    example: 'SCR-IP13-001',
    description: 'البحث بواسطة رمز التخزين (SKU)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'رمز التخزين لا يتجاوز 100 حرف' })
  sku?: string;

  @ApiPropertyOptional({
    example: 'شاشة',
    description: 'البحث بواسطة اسم قطعة الغيار (بحث جزئي)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'اسم قطعة الغيار لا يتجاوز 255 حرف' })
  name?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'رقم الصفحة',
    minimum: 1,
    default: 1,
  })
  @IsInt({ message: 'رقم الصفحة يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'رقم الصفحة يجب أن يكون أكبر من أو يساوي 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'عدد العناصر في الصفحة الواحدة',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsInt({ message: 'عدد العناصر يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'عدد العناصر يجب أن يكون أكبر من أو يساوي 1' })
  @Max(100, { message: 'عدد العناصر يجب أن يكون أقل من أو يساوي 100' })
  @Type(() => Number)
  limit?: number = 10;
}
