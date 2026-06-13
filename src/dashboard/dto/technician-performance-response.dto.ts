export class TechnicianPerformanceResponseDto {
  technicianId: string;
  technicianName: string;
  resolvedRequestsCount: number;
  totalRepairHours: number;
  totalProfit: string;
}

export class TechniciansPerformanceResponseDto {
  technicians: TechnicianPerformanceResponseDto[];
}