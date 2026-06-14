import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  MaxLength,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'tech1@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'يجب أن يكون البريد الإلكتروني صالحاً' })
  @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
  @MaxLength(255, { message: 'البريد الإلكتروني لا يجب أن يتجاوز 255 حرفاً' })
  email: string;

  @ApiProperty({
    example: 'securepassword',
    description: 'Password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @MaxLength(255, { message: 'كلمة المرور لا يجب أن تتجاوز 255 حرفاً' })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty({ message: 'الاسم الكامل مطلوب' })
  @MaxLength(255, { message: 'الاسم الكامل لا يجب أن يتجاوز 255 حرفاً' })
  fullName: string;

  @ApiProperty({
    example: 'Field Technician',
    description: 'Job title',
  })
  @IsString()
  @MaxLength(255, { message: 'المسمى الوظيفي لا يجب أن يتجاوز 255 حرفاً' })
  jobTitle: string;

  @ApiProperty({
    example: '0912345678',
    description: 'Phone number',
  })
  @IsString()
  @MaxLength(50, { message: 'رقم الهاتف لا يجب أن يتجاوز 50 حرفاً' })
  phone: string;

  @ApiProperty({
    example: 500000,
    description: 'Monthly salary in SYP',
  })
  @IsNumber()
  @Min(0)
  @Max(9999999999.99, { message: 'الراتب لا يجب أن يتجاوز 9999999999.99' })
  salary: number;

  @ApiProperty({
    example: 'Technician',
    description: 'Role name to assign',
  })
  @IsString()
  @IsNotEmpty({ message: 'الدور مطلوب' })
  @MinLength(1, { message: 'الدور مطلوب' })
  role: string;
}
