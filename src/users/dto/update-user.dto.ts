import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsBoolean,
  MaxLength,
  Max,
  IsEmail,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    example: 'john.updated@example.com',
    required: false,
    description: 'User email address',
  })
  @IsEmail({}, { message: 'يجب أن يكون البريد الإلكتروني صالحاً' })
  @MaxLength(255, { message: 'البريد الإلكتروني لا يجب أن يتجاوز 255 حرفاً' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'John Updated',
    required: false,
    description: 'Full name of the user',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'الاسم الكامل لا يجب أن يتجاوز 255 حرفاً' })
  fullName?: string;

  @ApiProperty({
    example: 'Senior Technician',
    required: false,
    description: 'Job title',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'المسمى الوظيفي لا يجب أن يتجاوز 255 حرفاً' })
  jobTitle?: string;

  @ApiProperty({
    example: '0912345679',
    required: false,
    description: 'Phone number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'رقم الهاتف لا يجب أن يتجاوز 50 حرفاً' })
  phone?: string;

  @ApiProperty({
    example: 600000,
    required: false,
    description: 'Monthly salary in SYP',
  })
  @IsNumber()
  @Min(0)
  @Max(9999999999.99, { message: 'الراتب لا يجب أن يتجاوز 9999999999.99' })
  @IsOptional()
  salary?: number;

  @ApiProperty({
    example: false,
    required: false,
    description: 'User active status',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    example: 'Technician',
    required: false,
    description: 'Role name to assign',
  })
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'الدور مطلوب' })
  role?: string;
}
