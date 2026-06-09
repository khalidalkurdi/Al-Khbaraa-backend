import { IsOptional, IsString } from 'class-validator';

export class UploadLogoDto {
  @IsOptional()
  @IsString()
  mimetype?: string;

  @IsOptional()
  @IsString()
  originalname?: string;
}
