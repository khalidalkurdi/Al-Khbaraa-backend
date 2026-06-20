import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class QueryMovementsDto {
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  limit?: number;
}
