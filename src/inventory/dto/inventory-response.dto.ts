export class TechnicianInfoDto {
  id: string;
  fullName: string;
  email: string;
}

export class InventoryResponseDto {
  id: string;
  technicianId: string;
  technician: TechnicianInfoDto;
  inventoryDate: Date;
  toolsGiven?: string;
  notes?: string;
  createdAt: Date;
}
