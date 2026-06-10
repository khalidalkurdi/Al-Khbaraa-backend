import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'ID of the invoice to record payment for',
    format: 'uuid',
  })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({ description: 'Payment amount', example: '40000.00' })
  @IsNotEmpty()
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Currency of payment',
    enum: ['SYP', 'USD'],
    default: 'SYP',
  })
  @IsEnum(['SYP', 'USD'])
  currency: 'SYP' | 'USD';

  @ApiProperty({
    description: 'Payment method',
    enum: ['cash', 'sham_cash'],
    default: 'cash',
  })
  @IsEnum(['cash', 'sham_cash'])
  paymentMethod: 'cash' | 'sham_cash';

  @ApiPropertyOptional({
    description: 'Optional notes for payment',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
