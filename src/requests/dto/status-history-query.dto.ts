import { IsOptional, IsString } from 'class-validator';
import { MinDate } from '../../common/validators/min-date.validator';

export class StatusHistoryQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  changedBy?: string;

  @IsOptional()
  @IsString()
  @MinDate({ message: 'تاريخ البداية يجب أن يكون في أو بعد 2026-07-10' })
  startDate?: string;

  @IsOptional()
  @IsString()
  @MinDate({ message: 'تاريخ النهاية يجب أن يكون في أو بعد 2026-07-10' })
  endDate?: string;
}
