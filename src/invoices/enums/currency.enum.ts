import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum CurrencyEnum {
  SYP = 'SYP',
  USD = 'USD',
}

export function IsCurrency() {
  return IsEnum(CurrencyEnum);
}

export function CurrencyApiProperty(description = 'Currency code') {
  return ApiProperty({
    description,
    enum: CurrencyEnum,
    example: 'SYP',
  });
}

export type Currency = (typeof CurrencyEnum)[keyof typeof CurrencyEnum];
