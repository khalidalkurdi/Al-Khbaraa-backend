import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsEnum, IsDecimal } from 'class-validator';
import { CurrencyEnum } from '../enums/currency.enum';

export class CreateInvoiceItemDto {
  @ApiProperty({
    description: 'ID of the spare part to invoice',
    format: 'uuid',
  })
  @IsUUID()
  sparePartId: string;

  @ApiProperty({
    description: 'Quantity of the spare part',
    minimum: 1,
    default: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Price per unit in the specified currency',
    minimum: 0.01,
    type: Number,
  })
  unitPrice?: number;

  @ApiProperty({ description: 'Currency for this item', enum: CurrencyEnum })
  @IsEnum(CurrencyEnum)
  currency: CurrencyEnum;
}
