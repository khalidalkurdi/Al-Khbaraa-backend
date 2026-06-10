import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsInt, IsOptional, Min } from 'class-validator';

export class CreateInvoiceItemDto {
  @ApiPropertyOptional({ description: 'ID of the spare part to invoice', format: 'uuid' })
  @IsUUID()
  sparePartId: string;

  @ApiPropertyOptional({ description: 'Quantity of the spare part', minimum: 1, default: 1, type: Number })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Price per unit in the specified currency', minimum: 0.01, type: Number })
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({ description: 'Currency for this item', enum: ['SYP', 'USD'] })
  currency: string;

  @ApiPropertyOptional({ description: 'Optional notes for this line item', maxLength: 1000 })
  @IsOptional()
  notes?: string;
}
