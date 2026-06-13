import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isNotFutureDate', async: false })
export class IsNotFutureDateValidator implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return true;
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate <= today;
  }

  defaultMessage(): string {
    return 'inventoryDate cannot be a future date';
  }
}

function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotFutureDateValidator,
    });
  };
}

export class CreateInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  technicianId: string;

  @IsDateString()
  @IsNotEmpty()
  @IsNotFutureDate({ message: 'inventoryDate cannot be a future date' })
  inventoryDate: string;

  @IsString()
  @IsNotEmpty()
  toolsGiven: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
