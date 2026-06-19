import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateRequestDeviceDto {
  @ApiProperty({
    example: 'Smartphone',
    description: 'نوع الجهاز (مثل: هاتف، حاسوب، تابلت)',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deviceType: string;

  @ApiProperty({
    example: 'iPhone 13 Pro',
    description: 'اسم الجهاز',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deviceName: string;

  @ApiPropertyOptional({
    example: 'Apple',
    description: 'العلامة التجارية للجهاز',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({
    example: 'A2636',
    description: 'رقم الموديل',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;
}
