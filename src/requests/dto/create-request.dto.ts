import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRequestDeviceDto } from './create-request-device.dto';
import { RequestType, Priority } from '@prisma/client';

export class InlineCustomerDto {
  @ApiProperty({
    example: 'أحمد محمد',
    description: 'اسم العميل',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: '05XXXXXXXX',
    description: 'رقم الهاتف الأول',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstPhone: string;

  @ApiPropertyOptional({
    example: '05YYYYYYYY',
    description: 'رقم الهاتف الثاني (اختياري)',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  secondPhone?: string;

  @ApiProperty({
    example: 'الرياض - حي النخيل - شارع الأمير سعود',
    description: 'عنوان العميل',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  address: string;

  @ApiPropertyOptional({
    example: 'https://maps.google.com/...',
    description: 'رابط موقع العميل على الخريطة',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  locationLink?: string;
}

export class CreateRequestDto {
  @ApiPropertyOptional({
    type: InlineCustomerDto,
    description: 'بيانات العميل (إذا كان عميل جديد)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InlineCustomerDto)
  customer?: InlineCustomerDto;

  @ApiProperty({
    enum: RequestType,
    enumName: 'RequestType',
    example: 'external',
    description: 'نوع الطلب (داخلي أو خارجي)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsEnum(RequestType)
  type: string;

  @ApiPropertyOptional({
    enum: Priority,
    enumName: 'Priority',
    example: 'high',
    description: 'درجة الأولوية',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @IsEnum(Priority)
  priority?: string;

  @ApiProperty({
    example: 'الجهاز لا يعمل والشاشة مكسورة',
    description: 'وصف العطل بالتفصيل',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  faultDescription: string;

  @ApiPropertyOptional({
    example: 'يحتاج إلى قطع غيار خاصة',
    description: 'ملاحظات إضافية',
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    example: '2024-06-20',
    description: 'التاريخ المحدد للصيانة (YYYY-MM-DD)',
  })
  @IsString()
  @IsOptional()
  scheduledDate?: string;

  @ApiProperty({
    type: [CreateRequestDeviceDto],
    description: 'قائمة الأجهزة المراد إصلاحها',
    example: [
      {
        deviceType: 'Smartphone',
        deviceName: 'iPhone 13 Pro',
        brand: 'Apple',
        model: 'A2636',
      },
      {
        deviceType: 'Laptop',
        deviceName: 'MacBook Pro',
        brand: 'Apple',
        model: 'M1',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequestDeviceDto)
  devices: CreateRequestDeviceDto[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'معرف الفني المسؤول (UUID)',
  })
  @IsOptional()
  @IsUUID()
  technicianId: string;
}
