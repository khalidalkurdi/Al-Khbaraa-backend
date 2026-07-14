import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  Min,
  Max,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';
import { Transform } from 'class-transformer';

@ValidatorConstraint({ name: 'MonthYearConstraint', async: false })
export class MonthYearConstraint implements ValidatorConstraintInterface {
  validate(months: number[], args: ValidationArguments) {
    const dto = args.object as FinancialReportQueryDto;
    if (dto.year === 2026 && Array.isArray(months)) {
      return months.every((m) => m >= 7);
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'لعام 2026، يجب أن يكون الشهر 7 أو أكبر';
  }
}

function IsValidMonthForYear() {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidMonthForYear',
      target: object.constructor,
      propertyName,
      constraints: [],
      validator: MonthYearConstraint,
    });
  };
}

export class FinancialReportQueryDto {
  @ApiProperty({
    description: 'السنة',
    example: 2024,
    type: Number,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber({}, { message: 'السنة يجب أن تكون رقماً' })
  year: number;

  @ApiProperty({
    description: 'قائمة الأشهر (بحد أقصى 3 أشهر)',
    example: [1, 2, 3],
    type: [Number],
  })
  @Transform(({ value }) => {
    // Handle null/undefined
    if (!value) {
      return [];
    }

    // If it's already an array
    if (Array.isArray(value)) {
      return value.map((v) => parseInt(v, 10)).filter((v) => !isNaN(v));
    }

    // If it's a string
    if (typeof value === 'string') {
      // Check if it's a comma-separated list
      if (value.includes(',')) {
        return value
          .split(',')
          .map((v) => parseInt(v.trim(), 10))
          .filter((v) => !isNaN(v));
      }
      // Single value
      const num = parseInt(value, 10);
      return isNaN(num) ? [] : [num];
    }

    // If it's a number
    if (typeof value === 'number') {
      return [value];
    }

    // If it's an object (maybe from JSON)
    if (typeof value === 'object') {
      try {
        const arr = Array.isArray(value) ? value : [value];
        return arr.map((v) => parseInt(v, 10)).filter((v) => !isNaN(v));
      } catch {
        return [];
      }
    }

    return [];
  })
  @IsArray({ message: 'الأشهر يجب أن تكون مصفوفة من الأرقام' })
  @ArrayMinSize(1, { message: 'يجب تحديد شهر واحد على الأقل' })
  @ArrayMaxSize(3, { message: 'الحد الأقصى 3 أشهر' })
  @IsNumber({}, { each: true, message: 'كل شهر يجب أن يكون رقماً' })
  @Min(1, { each: true, message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Max(12, { each: true, message: 'الشهر يجب أن يكون بين 1 و 12' })
  @IsValidMonthForYear()
  months: number[];
}
