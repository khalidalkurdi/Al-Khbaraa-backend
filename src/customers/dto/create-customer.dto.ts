import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // ✅ أضف هذا
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'أحمد محمد',
    description: 'الاسم الكامل للعميل',
    maxLength: 255,
  })
  @IsString({ message: 'الاسم يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  @MaxLength(255, { message: 'الاسم لا يتجاوز 255 حرفاً' })
  name: string;

  @ApiProperty({
    example: '0555123456',
    description: 'رقم الهاتف الأول (الرئيسي)',
    maxLength: 50,
  })
  @IsString({ message: 'رقم الهاتف يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'رقم الهاتف الأول مطلوب' })
  @MaxLength(50, { message: 'رقم الهاتف لا يتجاوز 50 حرفاً' })
  firstPhone: string;

  @ApiPropertyOptional({
    example: '0555987654',
    description: 'رقم الهاتف الثاني (اختياري)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'رقم الهاتف الثاني يجب أن يكون نصاً' })
  @MaxLength(50, { message: 'رقم الهاتف الثاني لا يتجاوز 50 حرفاً' })
  secondPhone?: string;

  @ApiProperty({
    example: 'الرياض - حي النخيل - شارع الأمير سعود - مبنى 10',
    description: 'عنوان العميل (اختياري)',
    maxLength: 500,
  })
  @IsString({ message: 'العنوان يجب أن يكون نصاً' })
  @MaxLength(500, { message: 'العنوان لا يتجاوز 500 حرف' })
  address: string;

  @ApiPropertyOptional({
    example: 'https://maps.google.com/...',
    description: 'رابط موقع العميل على الخريطة (اختياري)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'رابط الموقع يجب أن يكون نصاً' })
  @MaxLength(500, { message: 'رابط الموقع لا يتجاوز 500 حرف' })
  locationLink?: string;
}
