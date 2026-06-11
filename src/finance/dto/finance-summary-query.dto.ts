import { IsDateString, IsOptional, Min } from 'class-validator';

export class FinanceSummaryQueryDto {
  @IsDateString()
  @Min(10)
  startDate: string;

  @IsDateString()
  @Min(10)
  endDate: string;
}
