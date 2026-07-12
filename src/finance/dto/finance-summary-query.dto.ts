import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // ✅ أضف هذا
import { IsDateString, IsOptional, Min, IsString } from 'class-validator';
import { MinDate } from '../../common/validators/min-date.validator';

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
  @MinDate({
    message: 'تاريخ البداية يجب أن يكون في أو بعد 2026-07-10',
  })
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
  @MinDate({
    message: 'تاريخ النهاية يجب أن يكون في أو بعد 2026-07-10',
  })
  endDate: string;
}
