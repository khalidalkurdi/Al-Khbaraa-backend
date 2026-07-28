import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInvoiceItemDto {
  @ApiPropertyOptional({
    description: 'ID of the existing invoice item to update',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description: 'ID of the spare part',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  sparePartId?: string;

  @ApiPropertyOptional({
    description: 'Quantity of the spare part',
    minimum: 1,
    default: 1,
    type: Number,
    example: 2,
  })
  @IsOptional()
  @IsNumber({}, { message: 'quantity must be a number' })
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Price per unit in the specified currency',
    minimum: 0.01,
    type: Number,
    example: 50.0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'unitPrice must be a number' })
  @Min(0.01, { message: 'unitPrice must be at least 0.01' })
  @Type(() => Number)
  unitPrice?: number;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    description: 'Total amount of the invoice',
    example: '40000.00',
    minimum: 0.01,
    type: 'number',
  })
  @IsOptional()
  @IsNumber({}, { message: 'المبلغ الإجمالي يجب أن يكون رقماً' })
  @Min(0.01, { message: 'المبلغ الإجمالي يجب أن يكون أكبر من 0' })
  @Type(() => Number)
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Paid amount of the invoice',
    example: '20000.00',
    minimum: 0,
    type: 'number',
  })
  @IsOptional()
  @IsNumber({}, { message: 'المبلغ المدفوع يجب أن يكون رقماً' })
  @Min(0, { message: 'المبلغ المدفوع لا يمكن أن يكون سالباً' })
  @Type(() => Number)
  paidAmount?: number;

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
    type: [UpdateInvoiceItemDto],
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 2,
        unitPrice: 25000,
      },
    ],
  })
  @IsArray({ message: 'عناصر الفاتورة يجب أن تكون مصفوفة' })
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceItemDto)
  @IsOptional()
  items?: UpdateInvoiceItemDto[];
}
