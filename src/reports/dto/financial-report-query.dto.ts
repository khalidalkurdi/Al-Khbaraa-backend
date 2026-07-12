import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';

export class FinancialReportQueryDto {
  @ApiProperty({
    description: 'السنة',
    example: 2024,
    type: Number,
  })
  @IsNumber({}, { message: 'السنة يجب أن تكون رقماً' })
  year: number;

  @ApiProperty({
    description: 'قائمة الأشهر (بحد أقصى 3 أشهر)',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray({ message: 'الأشهر يجب أن تكون مصفوفة من الأرقام' })
  @ArrayMinSize(1, { message: 'يجب تحديد شهر واحد على الأقل' })
  @ArrayMaxSize(3, { message: 'الحد الأقصى 3 أشهر' })
  @IsNumber({}, { each: true, message: 'كل شهر يجب أن يكون رقماً' })
  @Min(1, { each: true, message: 'الشهر يجب أن يكون بين 1 و 12' })
  @Max(12, { each: true, message: 'الشهر يجب أن يكون بين 1 و 12' })
  months: number[];
}
