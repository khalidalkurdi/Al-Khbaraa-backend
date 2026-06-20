import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';

export class MovementResponseDto {
  @ApiProperty({
    example: 'MOV-000001',
    description: 'Movement number',
  })
  movementNo: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Part ID',
  })
  partId: string;

  @ApiProperty({
    enum: MovementType,
    example: 'supply',
    description: 'Movement type',
  })
  movementType: MovementType;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Responsible user ID',
  })
  responsibleId: string;

  @ApiPropertyOptional({
    example: 'INV-2024-001',
    description: 'Reference',
    nullable: true,
  })
  reference: string | null;

  @ApiProperty({
    example: 5,
    description: 'Quantity',
  })
  quantity: number;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Movement date',
  })
  movementDate: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Created at',
  })
  createdAt: Date;
}
