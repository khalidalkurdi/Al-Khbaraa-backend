// users/dto/create-user.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  MaxLength,
  IsOptional,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'tech1@example.com' })
  @IsEmail({}, { message: 'يجب أن يكون البريد الإلكتروني صالحاً' })
  @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
  email: string;

  @ApiProperty({ example: 'securepassword' })
  @IsString()
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @MaxLength(255)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty({ message: 'الاسم الكامل مطلوب' })
  fullName: string;

  @ApiPropertyOptional({ example: 'Field Technician' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  phone: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  @Max(9999999999.99)
  salary: number;

  @ApiProperty({ example: 'Technician' })
  @IsString()
  @IsNotEmpty({ message: 'الدور مطلوب' })
  role: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'الصورة الشخصية (اختياري) - PNG, JPEG, WebP',
  })
  @IsOptional()
  profileImage?: any;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'صورة الوثيقة (اختياري) - PNG, JPEG, WebP',
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
