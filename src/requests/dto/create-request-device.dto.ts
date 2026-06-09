import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateRequestDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deviceType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deviceName: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;
}
