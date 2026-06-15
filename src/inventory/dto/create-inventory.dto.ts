import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  technicianId: string;

  @IsString()
  @IsNotEmpty()
  toolsGiven: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
