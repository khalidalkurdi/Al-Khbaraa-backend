import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMovementsDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'رقم الصفحة المطلوبة',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'رقم الصفحة يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'رقم الصفحة يجب أن يكون على الأقل 1' })
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'عدد العناصر في الصفحة الواحدة',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsInt({ message: 'عدد العناصر يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'عدد العناصر يجب أن يكون على الأقل 1' })
  @Max(100, { message: 'عدد العناصر يجب أن يكون على الأكثر 100' })
  @Type(() => Number)
  limit: number = 10;
}
