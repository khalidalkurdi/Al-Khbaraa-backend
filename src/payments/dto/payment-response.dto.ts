import { ApiProperty } from '@nestjs/swagger';
import { CurrencyEnum } from '../../invoices/enums/currency.enum';

export class PaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  invoiceId: string;

  @ApiProperty({ example: '40000.00' })
  amount: string;

  @ApiProperty({ enum: CurrencyEnum })
  currency: CurrencyEnum;

  @ApiProperty({ enum: ['cash', 'sham_cash'] })
  paymentMethod: 'cash' | 'sham_cash';

  @ApiProperty({ example: '15000.0000', nullable: true })
  dollarExchangeRate: string | null;

  @ApiProperty({ example: '40000.00' })
  convertedAmount: string;

  @ApiProperty()
  paidAt: Date;
}
