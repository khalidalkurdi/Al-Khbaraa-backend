import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSettingsDto {
  @IsString()
  @MaxLength(255, { message: 'اسم المركز لا يجب أن يتجاوز 255 حرفاً' })
  centerName: string;

  @IsString()
  @MaxLength(255, { message: 'الاسم الثانوي لا يجب أن يتجاوز 255 حرفاً' })
  secondaryName: string;

  @IsString()
  @IsNotEmpty({ message: 'العنوان لا يجب أن يكون فارغاً' })
  address: string;

  @IsString()
  @MaxLength(50, { message: 'الهاتف 1 لا يجب أن يتجاوز 50 حرفاً' })
  phone1: string;

  @IsString()
  @MaxLength(50, { message: 'الهاتف 2 لا يجب أن يتجاوز 50 حرفاً' })
  phone2: string;

  @IsEmail(undefined, { message: 'يجب أن يكون البريد الإلكتروني صالحاً' })
  @MaxLength(255, { message: 'البريد الإلكتروني لا يجب أن يتجاوز 255 حرفاً' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'البند 1 لا يجب أن يتجاوز 1000 حرف' })
  term1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'البند 2 لا يجب أن يتجاوز 1000 حرف' })
  term2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'البند 3 لا يجب أن يتجاوز 1000 حرف' })
  term3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'البند 4 لا يجب أن يتجاوز 1000 حرف' })
  term4?: string;

  @IsOptional()
  @IsString()
  @Min(0.0001, { message: 'معدل صرف الدولار يجب أن يكون أكبر من 0' })
  dollarExchangeRate?: number;
}
