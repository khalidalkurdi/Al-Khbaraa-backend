import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@center.com',
    description: 'The email of the user',
  })
  @IsEmail({}, { message: 'يجب أن يكون البريد الإلكتروني صالحاً' })
  @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
  email: string;

  @ApiProperty({
    example: 'Password123@',
    description: 'User password (minimum 8 characters)',
  })
  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  password: string;

  @ApiProperty({
    example: 'fcm-token-xyz-123',
    description: 'FCM push token for the device',
  })
  @IsString()
  @IsNotEmpty({ message: 'رمز الجهاز مطلوب' })
  tokenDevice: string;
}
