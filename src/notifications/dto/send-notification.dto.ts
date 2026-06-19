import { ApiProperty } from '@nestjs/swagger'; // ✅ أضف هذا
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'معرف المستخدم المرسل إليه الإشعار',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'تم قبول طلبك',
    description: 'عنوان الإشعار',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'تم قبول طلب الصيانة رقم REQ-2024-001 وسيتم البدء بالعمل قريباً',
    description: 'محتوى الإشعار',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  body: string;
}
