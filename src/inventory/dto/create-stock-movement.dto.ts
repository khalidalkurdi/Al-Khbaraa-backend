import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateStockMovementDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'معرف المنتج/القطعة',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'Product selection is required' })
  @IsString()
  @IsUUID()
  partId: string;

  @ApiProperty({
    enum: MovementType,
    enumName: 'MovementType',
    example: 'supply',
    description: 'Movement type',
  })
  @IsNotEmpty({ message: 'Movement type is required' })
  @IsEnum(MovementType, { message: 'Invalid movement type selected' })
  movementType: MovementType;

  @ApiProperty({
    example: 5,
    description: 'Quantity',
    minimum: 1,
    type: 'integer',
  })
  @IsNotEmpty({ message: 'Quantity is required' })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @ApiPropertyOptional({
    example: 'INV-2024-001',
    description: 'Reference number (optional)',
  })
  @IsOptional()
  @IsString()
  reference?: string;
}
