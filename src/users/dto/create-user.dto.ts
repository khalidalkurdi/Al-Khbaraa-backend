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
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    example: 'securepassword',
    description: 'Password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(255, { message: 'Password must not exceed 255 characters' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MaxLength(255, { message: 'Full name must not exceed 255 characters' })
  fullName: string;

  @ApiProperty({
    example: 'Field Technician',
    description: 'Job title',
  })
  @IsString()
  @MaxLength(255, { message: 'Job title must not exceed 255 characters' })
  jobTitle: string;

  @ApiProperty({
    example: '0912345678',
    description: 'Phone number',
  })
  @IsString()
  @MaxLength(50, { message: 'Phone must not exceed 50 characters' })
  phone: string;

  @ApiProperty({
    example: 500000,
    description: 'Monthly salary in SYP',
  })
  @IsNumber()
  @Min(0)
  @Max(9999999999.99, { message: 'Salary must not exceed 9999999999.99' })
  salary: number;

  @ApiProperty({
    example: 'Technician',
    description: 'Role name to assign',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  @MinLength(1, { message: 'Role is required' })
  role: string;
}
