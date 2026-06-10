import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateSparePartDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
