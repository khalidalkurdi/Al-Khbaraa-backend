import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RequestStatus } from '@prisma/client';

export class UpdateTechnicianStatusDto {
  @ApiProperty({
    enum: RequestStatus,
    description: 'New status to set on the request',
  })
  @IsNotEmpty()
  @IsString()
  status: RequestStatus;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Optional note to provide additional context for the status update',
    required: false,
  })
  notes?: string;
}
