import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // ✅ أضف هذا
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'معرف الفني الذي سيستلم الأدوات',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'معرف الفني يجب أن يكون UUID صالحاً' })
  @IsNotEmpty({ message: 'معرف الفني مطلوب' })
  technicianId: string;

  @ApiProperty({
    example: 'مفك براغي, مطرقة, شاحن بطارية, جهاز اختبار',
    description: 'قائمة الأدوات المسلمة للفني (مفصولة بفواصل أو وصف)',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: 'قائمة الأدوات مطلوبة' })
  toolsGiven: string;

  @ApiPropertyOptional({
    example: 'تم تسليم الأدوات بتاريخ 2024-06-20، جميعها بحالة جيدة',
    description: 'ملاحظات إضافية عن عملية التسليم',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
