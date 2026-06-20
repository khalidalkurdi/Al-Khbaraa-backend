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
    message:
      'يجب أن يتكون رمز التخزين من حروف وأرقام فقط (يسمح بالشرطة والشرطة السفلية)',
  })
  sku?: string;

  @IsOptional()
  @IsString()
  shelf_location?: string;
  @IsInt()
  @Min(0, { message: 'تكلفة الليرة السورية يجب أن تكون أكبر من أو تساوي 0' })
  costSyp: number;

  @IsInt()
  @Min(0, { message: 'تكلفة الدولار يجب أن تكون أكبر من أو تساوي 0' })
  costUsd: number;
}
