import {
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { MIN_DATE } from '../constants/min-date.constant';

@ValidatorConstraint({ name: 'minDate', async: false })
export class MinDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments) {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) {
      return true;
    }

    return date.getTime() >= MIN_DATE.getTime();
  }

  defaultMessage(args: ValidationArguments) {
    const min = MIN_DATE.toISOString().split('T')[0];
    return `التاريخ يجب أن يكون في أو بعد ${min}`;
  }
}

export function MinDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    Validate(MinDateConstraint, validationOptions)(object, propertyName);
  };
}
