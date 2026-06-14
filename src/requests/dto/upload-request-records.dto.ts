import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadRequestRecordsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  requestId: string;
}
