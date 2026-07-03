import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // ✅ أضف هذا
import { IsDateString, IsOptional, Min, IsString } from 'class-validator';

export class FinanceSummaryQueryDto {
  @ApiProperty({
    description: 'تاريخ البداية للتقرير المالي (YYYY-MM-DD)',
    example: '2024-06-01',
    format: 'date',
  })
  @IsDateString(
    {},
    { message: 'تاريخ البداية غير صالح. يجب أن يكون بصيغة YYYY-MM-DD' },
  )
  startDate: string;

  @ApiProperty({
    description: 'تاريخ النهاية للتقرير المالي (YYYY-MM-DD)',
    example: '2024-06-30',
    format: 'date',
  })
  @IsDateString(
    {},
    { message: 'تاريخ النهاية غير صالح. يجب أن يكون بصيغة YYYY-MM-DD' },
  )
  endDate: string;
}
