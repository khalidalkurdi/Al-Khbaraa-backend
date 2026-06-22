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
} from 'class-validator';
import { CurrencyEnum } from '../enums/currency.enum';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';
import { InvoiceStatus, InvoiceType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
export class CreatePaymentInline {
  @ApiProperty({ description: 'Payment amount', example: '40000.00' })
  @IsNotEmpty()
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Currency of payment',
    enum: CurrencyEnum,
    default: CurrencyEnum.SYP,
  })
  @IsEnum(CurrencyEnum)
  currency: CurrencyEnum;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    default: PaymentMethod.cash,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.cash;

  @IsOptional()
  @Type(() => Number)
  dollarExchangeRate?: number;

  @IsOptional()
  @Type(() => Number)
  convertedAmount?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Payment Info ',
    type: CreatePaymentInline,
  })
  @Type(() => CreatePaymentInline)
  payment: CreatePaymentInline;

  @ApiProperty({
    description: 'ID of the repair request to invoice',
    format: 'uuid',
  })
  @IsUUID()
  requestId: string;

  @IsEnum(InvoiceType)
  @IsOptional()
  type?: InvoiceType = InvoiceType.external;

  @ApiProperty({
    description: 'Invoice status',
    enum: InvoiceStatus,
    default: InvoiceStatus.paid_partial,
    example: InvoiceStatus.paid_partial,
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus = InvoiceStatus.paid_partial;

  @ApiProperty({ description: 'PaymenTotal amount', example: '40000.00' })
  @IsNotEmpty()
  @Type(() => Number)
  totalAmount: number;

  @IsEnum(CurrencyEnum)
  @IsOptional()
  totalCurrency?: CurrencyEnum;

  @ApiPropertyOptional({
    description: 'Warranty period string (e.g. "90 days", "6 months")',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  warrantyPeriod?: string;

  @ApiPropertyOptional({
    description: 'Optional general notes',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Optional LocationURL for customer location',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  locationURL?: string;

  @ApiPropertyOptional({
    description: 'Notes about center maintenance requirements',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  needsCenterMaintenance?: string;

  @ApiProperty({
    description: 'Line items for the invoice',
    type: [CreateInvoiceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  @MinLength(1)
  items: CreateInvoiceItemDto[];
}
