import { IsArray, IsUUID, ArrayNotEmpty, ArrayUnique } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTechnicianBulkDto {
  @ApiProperty({
    type: [String],
    description: 'قائمة معرفات الطلبات (UUID)',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  requestIds: string[];

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174002',
    description: 'معرف الفني (UUID)',
  })
  @IsUUID()
  technicianId: string;
}
