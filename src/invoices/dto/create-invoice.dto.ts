import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsString, IsOptional, IsArray, ValidateNested, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'ID of the repair request to invoice', format: 'uuid' })
  @IsUUID()
  requestId: string;

  @ApiProperty({ description: 'Invoice type', enum: ['internal', 'external'] })
  @IsEnum(['internal', 'external'])
  type: 'internal' | 'external';

  @ApiPropertyOptional({ description: 'Warranty period string (e.g. "90 days", "6 months")', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  warrantyPeriod?: string;

  @ApiPropertyOptional({ description: 'Optional general notes', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Notes about center maintenance requirements', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  needsCenterMaintenance?: string;

  @ApiProperty({ description: 'Line items for the invoice', type: [CreateInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  @MinLength(1)
  items: CreateInvoiceItemDto[];
}
