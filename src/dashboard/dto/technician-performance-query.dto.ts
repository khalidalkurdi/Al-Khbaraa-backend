import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class TechnicianPerformanceQueryDto {
  @ApiPropertyOptional({
    description: 'Year (e.g. 2026)',
    example: 2026,
    minimum: 2000,
    maximum: 2100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'السنة يجب أن تكون رقماً' })
  @Min(2000, { message: 'السنة يجب أن تكون أكبر من أو تساوي 2000' })
  @Max(2100, { message: 'السنة يجب أن تكون أقل من أو تساوي 2100' })
  year?: number;

  @ApiPropertyOptional({
    description: 'Month (1-12)',
    example: 8,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'الشهر يجب أن يكون رقماً' })
  @Min(1, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Max(12, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  month?: number;

  @ApiPropertyOptional({
    description: 'Day (1-31)',
    example: 6,
    minimum: 1,
    maximum: 31,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'اليوم يجب أن يكون رقماً' })
  @Min(1, { message: 'اليوم يجب أن يكون بين 1 و 31' })
  @Max(31, { message: 'اليوم يجب أن يكون بين 1 و 31' })
  day?: number;
}