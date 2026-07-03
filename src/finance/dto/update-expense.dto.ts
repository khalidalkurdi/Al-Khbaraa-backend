import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
  IsEnum,
} from 'class-validator';
import { ExpenseType } from './create-expense.dto';

export class UpdateExpenseDto {
  @ApiPropertyOptional({
    description: 'نوع المصروف',
    enum: ExpenseType,
    enumName: 'ExpenseType',
    example: ExpenseType.FIXED,
    examples: ['fixed', 'variable'],
  })
  @IsOptional()
  @IsEnum(ExpenseType, { message: 'نوع المصروف غير صالح' })
  type?: ExpenseType;

  @ApiPropertyOptional({
    description: 'اسم المصروف',
    example: 'إيجار المكتب - محدث',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @Length(1, 100, { message: 'الاسم يجب أن يكون بين 1 و 100 حرف' })
  name?: string;

  @ApiPropertyOptional({
    description: 'قيمة المصروف',
    example: 550000,
    minimum: 0,
    type: 'number',
  })
  @IsOptional()
  @IsNumber({}, { message: 'المبلغ يجب أن يكون رقماً' })
  @Min(0, { message: 'المبلغ يجب أن يكون أكبر من أو يساوي 0' })
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({
    description: 'الشهر (مطلوب للمصروفات المتغيرة)',
    example: 6,
    minimum: 1,
    maximum: 12,
    type: 'integer',
  })
  @IsOptional()
  @ValidateIf((o) => o.type === ExpenseType.VARIABLE)
  @IsInt({ message: 'الشهر يجب أن يكون عدداً صحيحاً' })
  @Min(1, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Max(12, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Type(() => Number)
  month?: number;

  @ApiPropertyOptional({
    description: 'السنة (مطلوب للمصروفات المتغيرة)',
    example: 2026,
    minimum: 2000,
    type: 'integer',
  })
  @IsOptional()
  @ValidateIf((o) => o.type === ExpenseType.VARIABLE)
  @IsInt({ message: 'السنة يجب أن تكون عدداً صحيحاً' })
  @Min(2000, { message: 'السنة يجب أن تكون أكبر من أو تساوي 2000' })
  @Type(() => Number)
  year?: number;
}
