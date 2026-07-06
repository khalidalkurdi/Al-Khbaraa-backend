import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsInt,
  Min,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsDefined,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceItemDto {
  @ApiProperty({
    description: 'ID of the spare part to invoice (UUID)',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty({ message: 'sparePartId is required' })
  sparePartId: string;

  @ApiProperty({
    description: 'Quantity of the spare part',
    minimum: 1,
    default: 1,
    type: Number,
    example: 2,
  })
  @IsNumber({}, { message: 'quantity must be a number' })
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  @IsDefined({ message: 'quantity is required' })
  @Type(() => Number)
  quantity: number;

  @ApiProperty({
    description: 'Price per unit in the specified currency',
    minimum: 0.01,
    type: Number,
    example: 50.0,
  })
  @IsNumber({}, { message: 'unitPrice must be a number' })
  @Min(0.01, { message: 'unitPrice must be at least 0.01' })
  @IsDefined({ message: 'unitPrice is required' })
  @Type(() => Number)
  unitPrice: number;
}
