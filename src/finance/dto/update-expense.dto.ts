import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export type ExpenseType = 'fixed' | 'variable' | 'other';

export class UpdateExpenseDto {
  @IsOptional()
  @IsIn(['fixed', 'variable', 'other'])
  type?: ExpenseType;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @ValidateIf((o) => !o.type || o.type === 'fixed')
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @ValidateIf((o) => !o.type || o.type === 'fixed')
  @IsInt()
  @Min(2000)
  year?: number;
}
