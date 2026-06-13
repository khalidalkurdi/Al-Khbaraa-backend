export class DashboardStatsResponseDto {
  totalRequestsCount: number;
  activeRepairsCount: number;
  completedJobsCount: number;
  incompleteUnpaidCount: number;
  dailyRevenue: string;
  monthlyRevenue: string;
}