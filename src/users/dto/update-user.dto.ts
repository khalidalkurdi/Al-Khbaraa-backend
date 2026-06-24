// users/dto/update-user.dto.ts
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  MaxLength,
  Max,
  IsEmail,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'john.updated@example.com',
    required: false,
    description: 'User email address',
  })
  @IsEmail({}, { message: 'يجب أن يكون البريد الإلكتروني صالحاً' })
  @MaxLength(255, { message: 'البريد الإلكتروني لا يجب أن يتجاوز 255 حرفاً' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'John Updated',
    required: false,
    description: 'Full name of the user',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'الاسم الكامل لا يجب أن يتجاوز 255 حرفاً' })
  fullName?: string;

  @ApiPropertyOptional({
    example: 'Senior Technician',
    required: false,
    description: 'Job title',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'المسمى الوظيفي لا يجب أن يتجاوز 255 حرفاً' })
  jobTitle?: string;

  @ApiPropertyOptional({
    example: '0912345679',
    required: false,
    description: 'Phone number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'رقم الهاتف لا يجب أن يتجاوز 50 حرفاً' })
  phone?: string;

  @ApiPropertyOptional({
    example: 600000,
    required: false,
    description: 'Monthly salary in SYP',
  })
  @IsNumber()
  @Min(0)
  @Max(9999999999.99, { message: 'الراتب لا يجب أن يتجاوز 9999999999.99' })
  @IsOptional()
  salary?: number;

  @ApiPropertyOptional({
    example: false,
    required: false,
    description: 'User active status',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;

    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'Technician',
    required: false,
    description: 'Role name to assign',
  })
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'الدور مطلوب' })
  role?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile image (optional) - PNG, JPEG, WebP',
  })
  @IsOptional()
  profileImage?: any;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Document image (optional) - PNG, JPEG, WebP',
  })
  @IsOptional()
  documentImage?: any;

  @IsOptional()
  @IsString()
  profileImagePath?: string;

  @IsOptional()
  @IsString()
  documentImagePath?: string;
}
