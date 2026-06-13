import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';
import { TechnicianPerformanceQueryDto } from './dto/technician-performance-query.dto';
import { TechnicianPerformanceResponseDto, TechniciansPerformanceResponseDto } from './dto/technician-performance-response.dto';
import { FinancialReportQueryDto, FinancialReportResponseDto } from './dto/financial-report-query.dto';
import { FinanceService } from '../finance/finance.service';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
  ) {}

  async getDashboardStats(): Promise<DashboardStatsResponseDto> {
    this.logger.log('Fetching dashboard stats');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const [totalRequests, activeRepairs, completedJobs, incompleteUnpaid, dailyRevenue, monthlyRevenue] = await Promise.all([
      this.prisma.request.count(),
      this.prisma.request.count({
        where: {
          status: { in: [RequestStatus.accepted, RequestStatus.ontheway, RequestStatus.arrived, RequestStatus.underrepair, RequestStatus.pulltocenter] },
        },
      }),
      this.prisma.request.count({ where: { status: RequestStatus.completed } }),
      this.prisma.request.count({
        where: {
          status: { in: [RequestStatus.completed, RequestStatus.incompleted, RequestStatus.notrepairable] },
          invoices: {
            some: {
              remainingAmount: { gt: 0 },
            },
          },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { convertedAmount: true },
        where: {
          paidAt: { gte: todayStart, lt: todayEnd },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { convertedAmount: true },
        where: {
          paidAt: { gte: monthStart, lt: monthEnd },
        },
      }),
    ]);

    const toDecimal = (value: any): number => {
      if (!value) return 0;
      return parseFloat(value.toString());
    };

    return {
      totalRequestsCount: totalRequests,
      activeRepairsCount: activeRepairs,
      completedJobsCount: completedJobs,
      incompleteUnpaidCount: incompleteUnpaid,
      dailyRevenue: toDecimal(dailyRevenue._sum.convertedAmount).toFixed(2),
      monthlyRevenue: toDecimal(monthlyRevenue._sum.convertedAmount).toFixed(2),
    };
  }

  async getTechnicianPerformance(query: TechnicianPerformanceQueryDto): Promise<TechniciansPerformanceResponseDto> {
    this.logger.log(`Fetching technician performance with query: ${JSON.stringify(query)}`);

    const technicianWhere: any = {
      isActive: true,
      roles: {
        some: {
          role: {
            name: 'technician',
          },
        },
      },
    };

    if (query.technicianId) {
      technicianWhere.id = query.technicianId;
    }

    const technicians = await this.prisma.user.findMany({
      where: technicianWhere,
      select: {
        id: true,
        fullName: true,
      },
    });

    const results: TechnicianPerformanceResponseDto[] = [];

    for (const tech of technicians) {
      const assignments = await this.prisma.technicianAssignment.findMany({
        where: {
          technicianId: tech.id,
          isActive: true,
          request: {
            status: RequestStatus.completed,
          },
        },
        select: {
          request: {
            select: {
              id: true,
              statusHistory: {
                where: {
                  OR: [
                    { status: RequestStatus.accepted },
                    { status: RequestStatus.completed },
                  ],
                },
                orderBy: { changedAt: 'asc' },
              },
            },
          },
        },
      });

      const resolvedRequests = assignments.length;

      let totalRepairHours = 0;
      for (const assignment of assignments) {
        const acceptedDate = assignment.request?.statusHistory?.find((h) => h.status === RequestStatus.accepted)?.changedAt;
        const completedDate = assignment.request?.statusHistory?.find((h) => h.status === RequestStatus.completed)?.changedAt;

        if (acceptedDate && completedDate) {
          const hours = (completedDate.getTime() - acceptedDate.getTime()) / (1000 * 60 * 60);
          totalRepairHours += hours;
        }
      }

      const avgRepairHours = resolvedRequests > 0 ? totalRepairHours / resolvedRequests : 0;

      const invoices = await this.prisma.invoice.findMany({
        where: {
          technicianId: tech.id,
        },
        select: {
          totalAmount: true,
          items: {
            select: {
              quantity: true,
              sparePart: {
                select: {
                  costSyp: true,
                },
              },
            },
          },
        },
      });

      let totalProfit = 0;
      for (const invoice of invoices) {
        const partsCost = invoice.items.reduce(
          (sum, item) => sum + parseFloat(item.sparePart.costSyp.toString()) * item.quantity,
          0,
        );
        totalProfit += parseFloat(invoice.totalAmount.toString()) - partsCost;
      }

      results.push({
        technicianId: tech.id,
        technicianName: tech.fullName,
        resolvedRequestsCount: resolvedRequests,
        totalRepairHours: Math.round(avgRepairHours * 100) / 100,
        totalProfit: totalProfit.toFixed(2),
      });
    }

    return { technicians: results };
  }

  async getFinancialReport(query: FinancialReportQueryDto): Promise<FinancialReportResponseDto> {
    this.logger.log(`Fetching financial report from ${query.startDate} to ${query.endDate}`);

    const data = await this.financeService.getFinancialReportPdfData(query.startDate, query.endDate);

    return {
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalRevenues: data.totalRevenues,
      fixedCosts: data.fixedCosts,
      variableCosts: data.variableCosts,
      partsCosts: data.partsCosts,
      otherCosts: data.otherCosts,
      netProfit: data.netProfit,
      assumptions: data.assumptions,
    };
  }
}