import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSettingsDto {
  @IsString()
  @MaxLength(255, { message: 'centerName must not exceed 255 characters' })
  centerName: string;

  @IsString()
  @MaxLength(255, { message: 'secondaryName must not exceed 255 characters' })
  secondaryName: string;

  @IsString()
  @IsNotEmpty({ message: 'address should not be empty' })
  address: string;

  @IsString()
  @MaxLength(50, { message: 'phone1 must not exceed 50 characters' })
  phone1: string;

  @IsString()
  @MaxLength(50, { message: 'phone2 must not exceed 50 characters' })
  phone2: string;

  @IsEmail(undefined, { message: 'email must be a valid email address' })
  @MaxLength(255, { message: 'email must not exceed 255 characters' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'term1 must not exceed 1000 characters' })
  term1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'term2 must not exceed 1000 characters' })
  term2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'term3 must not exceed 1000 characters' })
  term3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'term4 must not exceed 1000 characters' })
  term4?: string;

  @IsOptional()
  @IsString()
  @Min(0.0001, { message: 'dollarExchangeRate must be greater than 0' })
  dollarExchangeRate?: number;
}
