import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'tech1@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'securepassword',
    description: 'Password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @ApiProperty({
    example: 'Field Technician',
    required: false,
    description: 'Job title',
  })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiProperty({
    example: '+963912345678',
    required: false,
    description: 'Phone number',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 500000,
    description: 'Monthly salary in SYP',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salary?: number;

  @ApiProperty({
    example: ['Technician'],
    description: 'Array of role names to assign',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'At least one role is required' })
  roles: string[];
}
