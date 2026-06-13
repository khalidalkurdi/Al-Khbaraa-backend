import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRequestDeviceDto } from './create-request-device.dto';

export class InlineCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstPhone: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  secondPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  locationLink?: string;
}

export class CreateRequestDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InlineCustomerDto)
  customer?: InlineCustomerDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  type: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  priority?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  faultDescription: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsString()
  @IsNotEmpty()
  scheduledDate: string;

  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequestDeviceDto)
  devices: CreateRequestDeviceDto[];
}
