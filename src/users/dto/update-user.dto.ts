import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    example: 'John Updated',
    required: false,
    description: 'Full name of the user',
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example: 'Senior Technician',
    required: false,
    description: 'Job title',
  })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiProperty({
    example: '+963912345679',
    required: false,
    description: 'Phone number',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 600000,
    required: false,
    description: 'Monthly salary in SYP',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salary?: number;

  @ApiProperty({
    example: false,
    required: false,
    description: 'User active status',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
