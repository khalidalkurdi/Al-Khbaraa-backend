import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class MonthlyDuesQueryDto {
  @ApiProperty({
    description: 'السنة المالية',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'السنة يجب أن تكون رقماً' })
  @Min(2000, { message: 'السنة يجب أن تكون أكبر من أو تساوي 2000' })
  @Max(2100, { message: 'السنة يجب أن تكون أقل من أو تساوي 2100' })
  year: number;

  @ApiProperty({
    description: 'الشهر (1-12)',
    example: 6,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'الشهر يجب أن يكون رقماً' })
  @Min(1, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Max(12, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  month: number;
}
