import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CurrencyEnum } from '../enums/currency.enum';

export class InvoiceResponse {
  @ApiProperty({ description: 'Invoice ID', format: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Unique invoice number',
    example: 'INV-20260611-1234',
  })
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
}
