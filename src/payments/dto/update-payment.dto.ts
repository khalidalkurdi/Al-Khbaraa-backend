import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePaymentDto {
  @ApiPropertyOptional({
    description: 'Whether the payment has been collected',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isCollected?: boolean;
}
