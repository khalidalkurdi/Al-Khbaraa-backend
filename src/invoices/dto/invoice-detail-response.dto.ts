import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CurrencyEnum } from '../enums/currency.enum';

export class InvoiceItemResponse {
  @ApiProperty({ description: 'Item ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Invoice ID', format: 'uuid' })
  invoiceId: string;

  @ApiProperty({ description: 'Spare part ID', format: 'uuid' })
  sparePartId: string;

  @ApiPropertyOptional({
    description: 'Name of spare part at time of invoice',
    nullable: true,
  })
  sparePartName?: string;

  @ApiProperty({ description: 'Quantity', type: Number })
  quantity: number;
  @ApiProperty({ description: 'Unit price', type: Number })
  unitPrice: number;

  @ApiProperty({ description: 'Currency', enum: CurrencyEnum })
  currency: CurrencyEnum;

  @ApiProperty({ description: 'Total price', type: Number })
  totalPrice: number;
}

export class PaymentResponse {
  @ApiProperty({ description: 'Payment ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Amount paid', type: Number })
  amount: number;
  @ApiProperty({ description: 'Currency', enum: CurrencyEnum })
  currency: CurrencyEnum;

  @ApiProperty({ description: 'Payment method', enum: ['cash', 'sham_cash'] })
  paymentMethod: string;

  @ApiPropertyOptional({
    description: 'Exchange rate at time of payment',
    nullable: true,
    type: Number,
  })
  dollarExchangeRate?: number;

  @ApiPropertyOptional({
    description: 'Converted amount',
    nullable: true,
    type: Number,
  })
  convertedAmount?: number;
  @ApiProperty({ description: 'Payment timestamp', format: 'date-time' })
  paidAt: Date;
}

export class InvoiceDetailResponse {
  @ApiProperty({ description: 'Invoice ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Unique invoice number' })
  invoiceNumber: string;

  @ApiProperty({ description: 'ID of the repair request', format: 'uuid' })
  requestId: string;

  @ApiProperty({
    description: 'ID of the technician who created the invoice',
    format: 'uuid',
  })
  technicianId: string;

  @ApiProperty({ description: 'Invoice type', enum: ['internal', 'external'] })
  type: string;

  @ApiProperty({
    description: 'Invoice payment status',
    enum: ['paid_full', 'paid_partial', 'refunded'],
  })
  status: string;

  @ApiProperty({ description: 'Subtotal amount', type: Number })
  totalAmount: number;

  @ApiProperty({ description: 'Currency code', enum: CurrencyEnum })
  totalCurrency: CurrencyEnum;

  @ApiProperty({ description: 'Amount paid so far', type: Number })
  paidAmount: number;

  @ApiProperty({ description: 'Remaining amount', type: Number })
  remainingAmount: number;

  @ApiPropertyOptional({ description: 'Warranty period', nullable: true })
  warrantyPeriod?: string;

  @ApiPropertyOptional({
    description: 'Center maintenance notes',
    nullable: true,
  })
  needsCenterMaintenance?: string;

  @ApiPropertyOptional({ description: 'General notes', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Creation timestamp', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Invoice line items',
    type: [InvoiceItemResponse],
  })
  @Type(() => InvoiceItemResponse)
  items: InvoiceItemResponse[];

  @ApiProperty({
    description: 'Payments for this invoice',
    type: [PaymentResponse],
  })
  @Type(() => PaymentResponse)
  payments: PaymentResponse[];
}
