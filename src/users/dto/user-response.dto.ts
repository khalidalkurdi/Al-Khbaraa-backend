import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userNumber: string;

  @ApiProperty({ required: false })
  profileImagePath?: string | null;

  @ApiProperty({ required: false })
  documentImagePath?: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ required: false })
  jobTitle?: string | null;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  salary: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  role: {
    id: string;
    name: string;
  };
}
