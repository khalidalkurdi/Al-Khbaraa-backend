import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WalletMovementType } from '@prisma/client';

export class InventoryItemDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'معرف القطعة الغيار',
  })
  @IsUUID(undefined, { message: 'معرف القطعة غير صالح' })
  @IsNotEmpty({ message: 'معرف القطعة مطلوب' })
  sparePartId: string;

  @ApiProperty({
    example: 5,
    description: 'الكمية المسلمة للفني',
    minimum: 1,
  })
  @IsNumber({}, { message: 'الكمية يجب أن تكون رقماً' })
  @Min(1, { message: 'الكمية يجب أن تكون 1 على الأقل' })
  quantity: number;
}

export class CreateInventoryDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'معرف الفني',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'معرف الفني يجب أن يكون UUID صالح' })
  @IsNotEmpty({ message: 'معرف الفني مطلوب' })
  technicianId: string;

  @ApiPropertyOptional({
    example: 'تم تسليم الأدوات بحالة جيدة',
    description: 'ملاحظات إضافية',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    type: [InventoryItemDto],
    description: 'قائمة القطع المسلمة للفني',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items: InventoryItemDto[];
}

export class UpdateInventoryDto {
  @ApiPropertyOptional({
    example: 'تم تحديث الملاحظات',
    description: 'ملاحظات إضافية',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    type: [InventoryItemDto],
    description: 'قائمة القطع المسلمة للفني',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items: InventoryItemDto[];
}

export class CreateWalletMovementDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'معرف مخزون الفني',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'معرف مخزون الفني غير صالح' })
  @IsNotEmpty({ message: 'معرف مخزون الفني مطلوب' })
  technicianInventoryId: string;

  @ApiProperty({
    example: 500.0,
    description: 'المبلغ',
    minimum: 0,
  })
  @IsNumber({}, { message: 'المبلغ يجب أن يكون رقماً' })
  @Min(0, { message: 'المبلغ لا يمكن أن يكون سالباً' })
  amount: number;

  @ApiProperty({
    enum: WalletMovementType,
    enumName: 'WalletMovementType',
    example: 'addition',
    description: 'نوع الحركة',
  })
  @IsNotEmpty({ message: 'نوع الحركة مطلوب' })
  type: WalletMovementType;

  @ApiPropertyOptional({
    example: 'دفعة نقدية',
    description: 'ملاحظات',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
