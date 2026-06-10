import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateSparePartDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message: 'SKU must be alphanumeric (dash and underscore allowed)',
  })
  sku?: string;

  @IsInt()
  @Min(0, { message: 'quantity must be >= 0' })
  quantity: number;

  @IsInt()
  @Min(0, { message: 'costSyp must be >= 0' })
  costSyp: number;

  @IsInt()
  @Min(0, { message: 'costUsd must be >= 0' })
  costUsd: number;
}
