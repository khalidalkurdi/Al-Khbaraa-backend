import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrencyEnum } from '../../invoices/enums/currency.enum';

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
    enum: CurrencyEnum,
    default: CurrencyEnum.SYP,
  })
  @IsEnum(CurrencyEnum)
  currency: CurrencyEnum;

  @ApiProperty({
    description: 'Payment method',
    enum: ['cash', 'sham_cash'],
    default: 'cash',
  })
  @IsEnum(['cash', 'sham_cash'])
  paymentMethod: 'cash' | 'sham_cash';
}
