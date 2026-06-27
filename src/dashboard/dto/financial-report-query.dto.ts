import { IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class FinancialReportQueryDto {
  @IsDateString()
  @Type(() => String)
  startDate: string;

  @IsDateString()
  @Type(() => String)
  endDate: string;
}

export class FinancialReportResponseDto {
  periodStart: string;
  periodEnd: string;
  totalRevenues: string;
  fixedCosts: string;
  variableCosts: string;
  partsCosts: string;
  otherCosts: string;
  netProfit: string;
  assumptions: string[];
}
