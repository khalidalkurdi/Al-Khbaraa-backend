import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

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
  date: string;
}
