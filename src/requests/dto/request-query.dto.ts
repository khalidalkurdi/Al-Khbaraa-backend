import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // ✅ أضف هذا
import { RequestStatus, Priority, RequestType } from '@prisma/client';

export class RequestQueryDto {
  @ApiPropertyOptional({
    enum: RequestStatus,
    enumName: 'RequestStatus',
    description: 'تصفية حسب حالة الطلب',
    example: 'accepted',
  })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({
    enum: Priority,
    enumName: 'Priority',
    description: 'تصفية حسب درجة الأولوية',
    example: 'high',
  })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({
    enum: RequestType,
    enumName: 'RequestType',
    description: 'تصفية حسب نوع الطلب',
    example: 'external',
  })
  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  @ApiPropertyOptional({
    example: '2024-06-01',
    description: 'تاريخ البداية للتصفية (YYYY-MM-DD)',
    maxLength: 10,
  })
  @IsOptional()
  @MaxLength(10)
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-06-20',
    description: 'تاريخ النهاية للتصفية (YYYY-MM-DD)',
    maxLength: 10,
  })
  @IsOptional()
  @MaxLength(10)
  endDate?: string;

  @ApiProperty({
    example: 1,
    description: 'رقم الصفحة',
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @ApiProperty({
    example: 10,
    description: 'عدد العناصر في الصفحة الواحدة',
    minimum: 1,
    maximum: 10,
    default: 10,
  })
  @Type(() => Number)
  @Min(1)
  @Max(10)
  limit: number = 10;

  @ApiPropertyOptional({
    example: 'iPhone',
    description: 'بحث في رقم الطلب، اسم العميل، رقم الهاتف',
    maxLength: 100,
  })
  @IsOptional()
  @MaxLength(100)
  search?: string;
}
