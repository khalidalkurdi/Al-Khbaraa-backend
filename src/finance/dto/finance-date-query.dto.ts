import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
import { MinDate } from '../../common/validators/min-date.validator';

export class FinanceDateQueryDto {
  @ApiProperty({
    description: 'التاريخ المطلوب (YYYY-MM-DD)',
    example: '2024-06-01',
    format: 'date',
  })
  @IsDateString(
    {},
    { message: 'التاريخ غير صالح. يجب أن يكون بصيغة YYYY-MM-DD' },
  )
  @MinDate({
    message: 'التاريخ يجب أن يكون في أو بعد 2026-07-10',
  })
  date: string;
}
