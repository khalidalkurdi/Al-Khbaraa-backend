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

export class CreateExpenseDto {
  @IsIn([['fixed', 'variable', 'other']])
  type: ExpenseType;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @ValidateIf((o) => o.type === 'variable' || o.type === 'other')
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ValidateIf((o) => o.type === 'variable' || o.type === 'other')
  @IsInt()
  @Min(2000)
  year?: number;
}
