import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsDateString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'maxDateRange', async: false })
export class MaxDateRangeConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments) {
    const object = args.object as ReportDateRangeQueryDto;
    const start = new Date(object.startDate);
    const end = new Date(object.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return true;
    }

    if (start > end) {
      return false;
    }

    const maxRangeMs = 92 * 24 * 60 * 60 * 1000;
    return end.getTime() - start.getTime() <= maxRangeMs;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as ReportDateRangeQueryDto;
    const start = new Date(object.startDate);
    const end = new Date(object.endDate);
    if (start > end) {
      return 'يجب أن يكون startDate قبل أو يساوي endDate';
    }
    return 'الحد الأقصى للفترة بين startDate و endDate هو 3 أشهر';
  }
}

export function MaxDateRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    Validate(MaxDateRangeConstraint, validationOptions)(object, propertyName);
  };
}

export class ReportDateRangeQueryDto {
  @ApiProperty({
    description: 'تاريخ البداية (YYYY-MM-DD)',
    example: '2024-06-01',
    format: 'date',
  })
  @IsDateString(
    {},
    { message: 'تاريخ البداية غير صالح. يجب أن يكون بصيغة YYYY-MM-DD' },
  )
  startDate: string;

  @ApiProperty({
    description: 'تاريخ النهاية (YYYY-MM-DD)',
    example: '2024-08-31',
    format: 'date',
  })
  @IsDateString(
    {},
    { message: 'تاريخ النهاية غير صالح. يجب أن يكون بصيغة YYYY-MM-DD' },
  )
  @MaxDateRange({
    message: 'الحد الأقصى للفترة بين startDate و endDate هو 3 أشهر',
  })
  endDate: string;
}
