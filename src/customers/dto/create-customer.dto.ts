import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstPhone: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  secondPhone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  locationLink?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
