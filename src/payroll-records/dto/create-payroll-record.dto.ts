import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // ✅ أضف هذا
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsEnum,
  IsUUID,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SettlementType } from '@prisma/client';

export class CreatePayrollRecordDto {
  @ApiProperty({
    description: 'معرف المستخدم (الموظف)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'معرف المستخدم غير صالح' })
  @IsString({ message: 'معرف المستخدم يجب أن يكون نصاً' })
  userId: string;

  @ApiProperty({
    description: 'السنة المالية',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
    type: 'integer',
  })
  @IsNumber({}, { message: 'السنة يجب أن تكون رقماً' })
  @Min(2000, { message: 'السنة يجب أن تكون أكبر من أو تساوي 2000' })
  @Max(2100, { message: 'السنة يجب أن تكون أقل من أو تساوي 2100' })
  @Type(() => Number)
  year: number;

  @ApiProperty({
    description: 'الشهر (1-12)',
    example: 6,
    minimum: 1,
    maximum: 12,
    type: 'integer',
  })
  @IsNumber({}, { message: 'الشهر يجب أن يكون رقماً' })
  @Min(1, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Max(12, { message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Type(() => Number)
  month: number;

  @ApiProperty({
    description: 'المبلغ (الراتب أو المكافأة أو الخصم)',
    example: 500000,
    minimum: 0,
    type: 'number',
  })
  @IsNumber({}, { message: 'المبلغ يجب أن يكون رقماً' })
  @Min(0, { message: 'المبلغ يجب أن يكون أكبر من أو يساوي 0' })
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({
    description: 'ملاحظات إضافية عن السجل',
    example: 'راتب شهر يونيو 2024',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'الملاحظات يجب أن تكون نصاً' })
  note?: string;

  @ApiProperty({
    description: 'نوع التسوية',
    enum: SettlementType,
    enumName: 'SettlementType',
    example: 'salary',
    examples: ['salary', 'bonus', 'deduction', 'overtime', 'commission'],
  })
  @IsEnum(SettlementType, { message: 'نوع تسوية غير صالح' })
  type: SettlementType;
}
