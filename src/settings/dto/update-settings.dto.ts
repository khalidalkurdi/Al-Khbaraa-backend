import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    example: 'مركز الصيانة المتطور',
    description: 'اسم المركز الرئيسي',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'اسم المركز لا يجب أن يتجاوز 255 حرفاً' })
  centerName?: string;

  @ApiPropertyOptional({
    example: 'Advanced Maintenance Center',
    description: 'الاسم الثانوي (باللغة الإنجليزية أو اختصار)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'الاسم الثانوي لا يجب أن يتجاوز 255 حرفاً' })
  secondaryName?: string;

  @ApiPropertyOptional({
    example: 'الرياض - حي النخيل - شارع الأمير سعود - مبنى 10',
    description: 'عنوان المركز بالتفصيل',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: '0555123456',
    description: 'رقم الهاتف الأول',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'الهاتف 1 لا يجب أن يتجاوز 50 حرفاً' })
  phone1?: string;

  @ApiPropertyOptional({
    example: '0555987654',
    description: 'رقم الهاتف الثاني',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'الهاتف 2 لا يجب أن يتجاوز 50 حرفاً' })
  phone2?: string;

  @ApiPropertyOptional({
    example: 'info@maintenance-center.com',
    description: 'البريد الإلكتروني الرسمي للمركز',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    example: 'سياسة الإرجاع: يمكن إرجاع الأجهزة خلال 7 أيام من تاريخ الاستلام',
    description: 'البند الأول من الشروط والأحكام',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'البند 1 لا يجب أن يتجاوز 1000 حرف' })
  term1?: string;

  @ApiPropertyOptional({
    example: 'سياسة الضمان: الضمان يشمل قطع الغيار لمدة 6 أشهر',
    description: 'البند الثاني من الشروط والأحكام',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'البند 2 لا يجب أن يتجاوز 1000 حرف' })
  term2?: string;

  @ApiPropertyOptional({
    example: 'سياسة الخصوصية: جميع البيانات محفوظة ولا تشارك مع أطراف خارجية',
    description: 'البند الثالث من الشروط والأحكام',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'البند 3 لا يجب أن يتجاوز 1000 حرف' })
  term3?: string;

  @ApiPropertyOptional({
    example: 'سياسة الدفع: الدفع نقداً أو عن طريق التحويل البنكي',
    description: 'البند الرابع من الشروط والأحكام',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'البند 4 لا يجب أن يتجاوز 1000 حرف' })
  term4?: string;

  @ApiPropertyOptional({
    example: 3.75,
    description: 'معدل صرف الدولار مقابل العملة المحلية (ريال سعودي)',
    minimum: 0.0001,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'معدل صرف الدولار يجب أن يكون رقماً' })
  @Min(0.0001, { message: 'معدل صرف الدولار يجب أن يكون أكبر من 0' })
  dollarExchangeRate?: number;
}
