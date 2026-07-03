import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
  Min,
  Max,
  IsDateString,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequestType, PaymentMethod, InvoiceStatus } from '@prisma/client';
import { CurrencyEnum } from '../enums/currency.enum';

export class InvoiceQueryDto {
  @ApiPropertyOptional({
    description: 'عملة الفاتورة',
    enum: CurrencyEnum,
    enumName: 'CurrencyEnum',
    default: CurrencyEnum.SYP,
    example: CurrencyEnum.SYP,
  })
  @IsOptional()
  @IsEnum(CurrencyEnum, { message: 'عملة غير صالحة' })
  currency?: CurrencyEnum;

  @ApiPropertyOptional({
    enum: InvoiceStatus,
    enumName: 'InvoiceStatus',
    description: 'تصفية حسب حالة الفاتورة',
    example: 'paid_partial',
  })
  @IsOptional()
  @IsEnum(InvoiceStatus, { message: 'حالة فاتورة غير صالحة' })
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    description: 'تصفية حسب طريقة الدفع',
    example: 'cash',
  })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'طريقة دفع غير صالحة' })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    enum: RequestType,
    enumName: 'RequestType',
    description: 'تصفية حسب نوع الطلب',
    example: 'external',
  })
  @IsOptional()
  @IsEnum(RequestType, { message: 'نوع طلب غير صالح' })
  type?: RequestType;

  @ApiPropertyOptional({
    example: '2024-06-01',
    description: 'تاريخ البداية للتصفية (YYYY-MM-DD)',
    maxLength: 10,
  })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ البداية غير صالح' })
  @MaxLength(10)
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-06-20',
    description: 'تاريخ النهاية للتصفية (YYYY-MM-DD)',
    maxLength: 10,
  })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ النهاية غير صالح' })
  @MaxLength(10)
  endDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'رقم الصفحة',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'رقم الصفحة يجب أن يكون أكبر من أو يساوي 1' })
  page: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'عدد العناصر في الصفحة الواحدة',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'عدد العناصر يجب أن يكون أكبر من أو يساوي 1' })
  @Max(100, { message: 'عدد العناصر يجب أن يكون أقل من أو يساوي 100' })
  limit: number = 10;

  @ApiPropertyOptional({
    example: 'iPhone',
    description: 'بحث في رقم الطلب، اسم العميل، رقم الهاتف، رقم الفاتورة',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'البحث يجب أن يكون نصاً' })
  @MaxLength(100, { message: 'البحث لا يتجاوز 100 حرف' })
  search?: string;
}
