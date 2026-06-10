import { IsNotEmpty, IsString } from 'class-validator';
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
}
