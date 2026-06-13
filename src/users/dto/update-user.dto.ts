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
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'John Updated',
    required: false,
    description: 'Full name of the user',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Full name must not exceed 255 characters' })
  fullName?: string;

  @ApiProperty({
    example: 'Senior Technician',
    required: false,
    description: 'Job title',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Job title must not exceed 255 characters' })
  jobTitle?: string;

  @ApiProperty({
    example: '0912345679',
    required: false,
    description: 'Phone number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Phone must not exceed 50 characters' })
  phone?: string;

  @ApiProperty({
    example: 600000,
    required: false,
    description: 'Monthly salary in SYP',
  })
  @IsNumber()
  @Min(0)
  @Max(9999999999.99, { message: 'Salary must not exceed 9999999999.99' })
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
  @MinLength(1, { message: 'Role is required' })
  role?: string;
}
