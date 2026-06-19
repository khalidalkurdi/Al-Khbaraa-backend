import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRequestDto } from './create-request.dto';
import { RequestStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateRequestDto extends PartialType(CreateRequestDto) {
  @ApiPropertyOptional({
    enum: RequestStatus,
    enumName: 'RequestStatus',
    example: 'accepted',
    description: 'حالة الطلب',
    examples: [
      'new',
      'accepted',
      'ontheway',
      'arrived',
      'underrepair',
      'completed',
      'incompleted',
      'pulltocenter',
      'postponed',
      'cancelled',
      'notanswer',
      'notrepairable',
      'repeated',
    ],
  })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: string;
}
