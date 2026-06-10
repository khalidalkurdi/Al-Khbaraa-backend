import { IsMongoId, IsNotEmpty } from 'class-validator';

export class AssignTechnicianDto {
  @IsNotEmpty()
  @IsMongoId()
  technicianId: string;
}
