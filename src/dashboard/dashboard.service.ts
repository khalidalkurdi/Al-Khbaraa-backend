import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';
import { TechnicianPerformanceTimelineDto } from './dto/technician-performance-response.dto';
import {
  FinancialReportQueryDto,
  FinancialReportResponseDto,
} from './dto/financial-report-query.dto';
import { FinanceService } from '../finance/finance.service';
import { RequestStatus } from '@prisma/client';
import { toSyriaDate } from '../common/utils/syria-date.util';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
  ) {}

  async getDashboardStats(): Promise<DashboardStatsResponseDto> {
    this.logger.log('Fetching dashboard stats');

    const now = toSyriaDate(new Date());
    const todayStart = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [
      totalRequests,
      internalRequests,
      externalRequests,
      completedJobs,
      incompletedJobs,
      pulltocenterJobs,
      repeatedJobs,
      postponedJobs,
      notrepairableJobs,
      externalInvoices,
      internalInvoices,
      newCustomersToday,
      totalRevenuesAgg,
    ] = await Promise.all([
      this.prisma.request.count({
        where: { createdAt: { gte: todayStart, lt: todayEnd }, isActive: true },
      }),
      this.prisma.request.count({
        where: {
          type: 'internal',
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.request.count({
        where: {
          type: 'external',
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.request.count({
        where: {
          status: RequestStatus.completed,
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.request.count({
        where: {
          status: RequestStatus.incompleted,
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.request.count({
        where: {
          status: RequestStatus.pulltocenter,
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.request.count({
        where: {
          status: RequestStatus.repeated,
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.request.count({
        where: {
          status: RequestStatus.postponed,
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.request.count({
        where: {
          status: RequestStatus.notrepairable,
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.invoice.count({
        where: {
          type: 'external',
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.invoice.count({
        where: {
          type: 'internal',
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.customer.count({
        where: {
          createdAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { convertedAmount: true },
        where: {
          paidAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
        },
      }),
    ]);

    const toDecimal = (value: unknown): number => {
      if (value === null || value === undefined) return 0;
      return Number(value);
    };

    const totalRevenuesSyp = toDecimal(totalRevenuesAgg._sum.convertedAmount);

    const todayPayments = await this.prisma.payment.findMany({
      where: {
        paidAt: { gte: todayStart, lt: todayEnd },
        isActive: true,
        invoice: {
          createdAt: { gte: todayStart, lt: todayEnd },
        },
      },
      include: {
        invoice: {
          include: {
            items: {
              include: {
                sparePart: true,
              },
            },
          },
        },
      },
    });

    const center = await this.prisma.centerSettings.findFirst();
    const exchangeRate = toDecimal(center?.dollarExchangeRate);

    let salesSyp = 0;
    let partsCosts = 0;
    const processedInvoiceIds = new Set<string>();

    for (const payment of todayPayments) {
      if (processedInvoiceIds.has(payment.invoiceId)) continue;
      processedInvoiceIds.add(payment.invoiceId);

      const invoice = payment.invoice;
      let invoiceTotalSyp: number;

      if (invoice.totalCurrency === 'USD') {
        invoiceTotalSyp = toDecimal(invoice.totalAmount) * exchangeRate;
      } else {
        invoiceTotalSyp = toDecimal(invoice.totalAmount);
      }

      salesSyp += invoiceTotalSyp;

      const invoicePartsCost = invoice.items.reduce(
        (sum, item) => sum + toDecimal(item.sparePart.costSyp) * item.quantity,
        0,
      );
      partsCosts += invoicePartsCost;
    }

    const netProfitTodaySyp = salesSyp - partsCosts;

    const lastRequestsRaw = await this.prisma.request.findMany({
      where: { isActive: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true },
        },
        devices: true,
        assignments: {
          where: { isActive: true },
          take: 1,
          include: {
            technician: {
              select: { fullName: true },
            },
          },
        },
      },
    });

    const lastRequests = lastRequestsRaw.map((req) => ({
      requestId: req.id,
      requestNumber: req.requestNumber,
      customerName: req.customer?.name || '',
      deviceInfo:
        req.devices
          .map((d) => `${d.deviceName} - ${d.deviceType}`)
          .join('، ') || '',
      technicianName: req.assignments[0]?.technician?.fullName || '',
      status: req.status,
    }));

    return {
      totalRequestsCount: totalRequests,
      internalRequestsCount: internalRequests,
      externalRequestsCount: externalRequests,
      completedCount: completedJobs,
      incompletedCount: incompletedJobs,
      pulltocenterCount: pulltocenterJobs,
      repeatedCount: repeatedJobs,
      postponedCount: postponedJobs,
      notrepairableCount: notrepairableJobs,
      externalInvoicesCount: externalInvoices,
      internalInvoicesCount: internalInvoices,
      newCustomersToday: newCustomersToday,
      totalRevenuesSyp: totalRevenuesSyp.toFixed(2),
      salesSyp: salesSyp.toFixed(2),
      netProfitTodaySyp: netProfitTodaySyp.toFixed(2),
      lastRequests,
    };
  }

  async getTechnicianPerformance() {
    this.logger.log(`Fetching technician performance`);

    const now = toSyriaDate(new Date());
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [technicians, todayChanges] = await Promise.all([
      this.prisma.user.findMany({
        where: { isActive: true, role: { name: 'Technician' } },
        select: { id: true, fullName: true, userNumber: true },
      }),
      this.prisma.requestStatusHistory.findMany({
        where: {
          changedAt: { gte: todayStart, lt: todayEnd },
          status: {
            in: [
              RequestStatus.completed,
              RequestStatus.incompleted,
              RequestStatus.pulltocenter,
              RequestStatus.accepted,
              RequestStatus.ontheway,
              RequestStatus.arrived,
              RequestStatus.underrepair,
            ],
          },
          isActive: true,
        },
        select: { requestId: true, status: true },
      }),
    ]);

    const technicianIds = technicians.map((t) => t.id);

    const changesByRequestId = new Map<string, Set<RequestStatus>>();
    for (const change of todayChanges) {
      const set =
        changesByRequestId.get(change.requestId) || new Set<RequestStatus>();
      set.add(change.status);
      changesByRequestId.set(change.requestId, set);
    }

    const completedToday = new Set(
      todayChanges
        .filter((c) => c.status === RequestStatus.completed)
        .map((c) => c.requestId),
    ).size;
    const incompletedToday = new Set(
      todayChanges
        .filter((c) => c.status === RequestStatus.incompleted)
        .map((c) => c.requestId),
    ).size;
    const pulltocenterToday = new Set(
      todayChanges
        .filter((c) => c.status === RequestStatus.pulltocenter)
        .map((c) => c.requestId),
    ).size;
    const activeToday = new Set(
      todayChanges
        .filter((c) => {
          const activeStatuses = new Set<RequestStatus>([
            RequestStatus.accepted,
            RequestStatus.ontheway,
            RequestStatus.arrived,
            RequestStatus.underrepair,
          ]);
          return activeStatuses.has(c.status);
        })
        .map((c) => c.requestId),
    ).size;

    const toDecimal = (value: unknown): number => {
      if (value === null || value === undefined) return 0;
      return Number(value);
    };

    const [paymentsSypTodayAgg, paymentsUsdTodayAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paidAt: { gte: todayStart, lt: todayEnd },
          currency: 'SYP',
          isActive: true,
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paidAt: { gte: todayStart, lt: todayEnd },
          currency: 'USD',
          isActive: true,
        },
      }),
    ]);

    const overall = {
      completedToday,
      incompletedToday,
      pulltocenterToday,
      activeToday,
      paymentsSypToday: toDecimal(paymentsSypTodayAgg._sum.amount),
      paymentsUsdToday: toDecimal(paymentsUsdTodayAgg._sum.amount),
    };

    if (technicianIds.length === 0) {
      return { overall, technicians: [] };
    }

    const todayChangeRequestIds = Array.from(changesByRequestId.keys());

    if (todayChangeRequestIds.length === 0) {
      return {
        overall,
        technicians: technicians.map((tech) => ({
          technicianId: tech.id,
          technicianName: tech.fullName,
          userNumber: tech.userNumber,
          completedCount: 0,
          incompletedCount: 0,
          activeCount: 0,
          pulltocenterCount: 0,
          timeline: [],
          paymentsSyp: 0,
          paymentsUsd: 0,
          sales: 0,
        })),
      };
    }

    const relevantAssignments = await this.prisma.technicianAssignment.findMany(
      {
        where: {
          requestId: { in: todayChangeRequestIds },
          isActive: true,
          technicianId: { in: technicianIds },
        },
        include: {
          request: {
            include: {
              statusHistory: { orderBy: { changedAt: 'asc' } },
              invoice: { include: { payments: true } },
            },
          },
        },
      },
    );

    const assignmentsByTechnician = new Map<
      string,
      typeof relevantAssignments
    >();
    for (const assignment of relevantAssignments) {
      const list = assignmentsByTechnician.get(assignment.technicianId) || [];
      list.push(assignment);
      assignmentsByTechnician.set(assignment.technicianId, list);
    }

    const techniciansResult = technicians.map((tech) => {
      const assignments = assignmentsByTechnician.get(tech.id) || [];

      const completedCount = new Set(
        assignments
          .filter((a) =>
            changesByRequestId.get(a.requestId)?.has(RequestStatus.completed),
          )
          .map((a) => a.requestId),
      ).size;
      const incompletedCount = new Set(
        assignments
          .filter((a) =>
            changesByRequestId.get(a.requestId)?.has(RequestStatus.incompleted),
          )
          .map((a) => a.requestId),
      ).size;
      const pulltocenterCount = new Set(
        assignments
          .filter((a) =>
            changesByRequestId
              .get(a.requestId)
              ?.has(RequestStatus.pulltocenter),
          )
          .map((a) => a.requestId),
      ).size;
      const activeCount = new Set(
        assignments
          .filter((a) => {
            const statuses = changesByRequestId.get(a.requestId);
            return (
              statuses &&
              [
                RequestStatus.accepted,
                RequestStatus.ontheway,
                RequestStatus.arrived,
                RequestStatus.underrepair,
              ].some((s) => statuses.has(s))
            );
          })
          .map((a) => a.requestId),
      ).size;

      const timeline: TechnicianPerformanceTimelineDto[] = [];
      let paymentsSyp = 0;
      let paymentsUsd = 0;
      let sales = 0;

      for (const assignment of assignments) {
        const request = assignment.request;
        const requestChanges = changesByRequestId.get(request.id);
        if (!requestChanges) continue;

        const underrepairChange = request.statusHistory.find(
          (h) => h.status === RequestStatus.underrepair,
        );
        const finalChange = request.statusHistory.find((h) => {
          const terminalStatuses = new Set<RequestStatus>([
            RequestStatus.completed,
            RequestStatus.incompleted,
            RequestStatus.pulltocenter,
          ]);
          return terminalStatuses.has(h.status);
        });
        const onthewayChange = request.statusHistory.find(
          (h) => h.status === RequestStatus.ontheway,
        );

        let maintenanceTime: number | null = null;
        if (underrepairChange && finalChange) {
          maintenanceTime =
            (finalChange.changedAt.getTime() -
              underrepairChange.changedAt.getTime()) /
            (1000 * 60);
        }

        let completionTime: number | null = null;
        let startTime: Date | null = null;
        let endTime: Date | null = null;

        if (onthewayChange && request.invoice) {
          startTime = onthewayChange.changedAt;
          endTime = request.invoice.createdAt;
          completionTime =
            (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        }

        timeline.push({
          requestId: request.id,
          requestNumber: request.requestNumber,
          status: request.status,
          maintenanceTime,
          completionTime,
          startTime,
          endTime,
        });

        if (request.invoice) {
          for (const payment of request.invoice.payments) {
            if (payment.currency === 'SYP') {
              paymentsSyp += toDecimal(payment.amount);
            } else if (payment.currency === 'USD') {
              paymentsUsd += toDecimal(payment.amount);
            }
          }
          sales += toDecimal(request.invoice.totalAmount);
        }
      }

      return {
        technicianId: tech.id,
        technicianName: tech.fullName,
        userNumber: tech.userNumber,
        completedCount,
        incompletedCount,
        activeCount,
        pulltocenterCount,
        timeline,
        paymentsSyp,
        paymentsUsd,
        sales,
      };
    });

    return { overall, technicians: techniciansResult };
  }
}
