import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { CurrencyEnum } from '../enums/currency.enum';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';
import { InvoiceStatus, InvoiceType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePaymentInline {
  @ApiProperty({
    description: 'Payment amount',
    example: '40000.00',
    minimum: 0.01,
    type: 'number',
  })
  @IsNotEmpty({ message: 'المبلغ مطلوب' })
  @IsNumber({}, { message: 'المبلغ يجب أن يكون رقماً' })
  @Min(0.01, { message: 'المبلغ يجب أن يكون أكبر من 0' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Currency of payment',
    enum: CurrencyEnum,
    enumName: 'CurrencyEnum',
    default: CurrencyEnum.SYP,
    example: CurrencyEnum.SYP,
  })
  @IsEnum(CurrencyEnum, { message: 'عملة غير صالحة' })
  currency: CurrencyEnum;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    default: PaymentMethod.cash,
    example: PaymentMethod.cash,
  })
  @IsEnum(PaymentMethod, { message: 'طريقة دفع غير صالحة' })
  paymentMethod: PaymentMethod = PaymentMethod.cash;
}

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Payment Information',
    type: CreatePaymentInline,
    example: {
      amount: 20000,
      currency: 'SYP',
      paymentMethod: 'cash',
    },
  })
  @ValidateNested({ message: 'بيانات الدفع غير صالحة' })
  @Type(() => CreatePaymentInline)
  payment: CreatePaymentInline;

  @ApiProperty({
    description: 'ID of the repair request to invoice',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'معرف الطلب غير صالح' })
  @IsNotEmpty({ message: 'معرف الطلب مطلوب' })
  requestId: string;

  @ApiProperty({
    description: 'Invoice status',
    enum: InvoiceStatus,
    enumName: 'InvoiceStatus',
    default: InvoiceStatus.paid_partial,
    example: InvoiceStatus.paid_partial,
  })
  @IsEnum(InvoiceStatus, { message: 'حالة الفاتورة غير صالحة' })
  @IsOptional()
  status?: InvoiceStatus = InvoiceStatus.paid_partial;

  @ApiProperty({
    description: 'Total amount of the invoice',
    example: '40000.00',
    minimum: 0.01,
    type: 'number',
  })
  @IsNotEmpty({ message: 'المبلغ الإجمالي مطلوب' })
  @IsNumber({}, { message: 'المبلغ الإجمالي يجب أن يكون رقماً' })
  @Min(0.01, { message: 'المبلغ الإجمالي يجب أن يكون أكبر من 0' })
  @Type(() => Number)
  totalAmount: number;

  @ApiPropertyOptional({
    description: 'Warranty period (e.g. "90 days", "6 months", "1 year")',
    example: '90 days',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'فترة الضمان يجب أن تكون نصاً' })
  @MaxLength(50, { message: 'فترة الضمان لا تتجاوز 50 حرفاً' })
  warrantyPeriod?: string;

  @ApiPropertyOptional({
    description: 'Optional general notes about the invoice',
    example: 'تم إصدار الفاتورة بناءً على طلب الصيانة رقم REQ-2024-001',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'الملاحظات يجب أن تكون نصاً' })
  @MaxLength(2000, { message: 'الملاحظات لا تتجاوز 2000 حرف' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Location URL for customer location (Google Maps link)',
    example: 'https://maps.google.com/...',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'رابط الموقع يجب أن يكون نصاً' })
  @MaxLength(2000, { message: 'رابط الموقع لا يتجاوز 2000 حرف' })
  locationURL?: string;

  @ApiPropertyOptional({
    description: 'Notes about center maintenance requirements',
    example: 'يحتاج الجهاز إلى صيانة مركزية بسبب تعقيد المشكلة',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'ملاحظات الصيانة يجب أن تكون نصاً' })
  @MaxLength(2000, { message: 'ملاحظات الصيانة لا تتجاوز 2000 حرف' })
  needsCenterMaintenance?: string;

  @ApiPropertyOptional({
    description: 'Line items for the invoice',
    type: [CreateInvoiceItemDto],
    example: [
      {
        sparePartId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 1,
        unitPrice: 25000,
      },
      {
        sparePartId: '987fcdeb-51a2-43d7-9b56-426614174111',
        quantity: 1,
        unitPrice: 15000,
      },
    ],
  })
  @IsArray({ message: 'عناصر الفاتورة يجب أن تكون مصفوفة' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  @IsOptional()
  items: CreateInvoiceItemDto[];
}
