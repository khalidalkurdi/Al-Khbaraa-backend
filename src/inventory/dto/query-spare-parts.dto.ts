import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
} from 'class-validator';

export class QuerySparePartsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'رقم الصفحة يجب أن يكون أكبر من أو يساوي 1' })
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'عدد العناصر يجب أن يكون أكبر من أو يساوي 1' })
  @Max(100, { message: 'عدد العناصر يجب أن يكون أقل من أو يساوي 100' })
  limit?: number;
}
