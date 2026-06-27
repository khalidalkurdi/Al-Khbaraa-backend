export class LastRequestDto {
  requestId: string;
  requestNumber: string;
  customerName: string;
  deviceInfo: string;
  technicianName: string;
  status: string;
}

export class DashboardStatsResponseDto {
  totalRequestsCount: number;
  internalRequestsCount: number;
  externalRequestsCount: number;
  completedCount: number;
  incompletedCount: number;
  pulltocenterCount: number;
  repeatedCount: number;
  postponedCount: number;
  notrepairableCount: number;
  externalInvoicesCount: number;
  internalInvoicesCount: number;
  newCustomersToday: number;
  totalRevenuesSyp: string;
  salesSyp: string;
  netProfitTodaySyp: string;
  lastRequests: LastRequestDto[];
}
