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
  @Min(0, { message: 'الكمية يجب أن تكون أكبر من أو تساوي 0' })
  quantity: number;

  @IsInt()
  @Min(0, { message: 'تكلفة الليرة السورية يجب أن تكون أكبر من أو تساوي 0' })
  costSyp: number;

  @IsInt()
  @Min(0, { message: 'تكلفة الدولار يجب أن تكون أكبر من أو تساوي 0' })
  costUsd: number;
}
