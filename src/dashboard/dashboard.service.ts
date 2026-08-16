import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';
import { TechnicianPerformanceTimelineDto } from './dto/technician-performance-response.dto';

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
      externalInvoices,
      internalInvoices,
      newCustomersToday,
      todayStatusChanges,
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
      this.prisma.requestStatusHistory.findMany({
        where: {
          changedAt: { gte: todayStart, lt: todayEnd },
          isActive: true,
          request: { isActive: true },
        },
        select: {
          requestId: true,
          status: true,
        },
      }),
    ]);

    const statusToRequestIds = new Map<RequestStatus, Set<string>>();
    for (const change of todayStatusChanges) {
      const set = statusToRequestIds.get(change.status) || new Set<string>();
      set.add(change.requestId);
      statusToRequestIds.set(change.status, set);
    }

    const completedJobs =
      statusToRequestIds.get(RequestStatus.completed)?.size ?? 0;
    const incompletedJobs =
      statusToRequestIds.get(RequestStatus.incompleted)?.size ?? 0;
    const pulltocenterJobs =
      statusToRequestIds.get(RequestStatus.pulltocenter)?.size ?? 0;
    const postponedJobs =
      statusToRequestIds.get(RequestStatus.postponed)?.size ?? 0;

    const lostRequestIds = new Set<string>();
    for (const status of [
      RequestStatus.cancelled,
      RequestStatus.notanswer,
      RequestStatus.notrepairable,
    ]) {
      const ids = statusToRequestIds.get(status);
      if (ids) {
        for (const id of ids) {
          lostRequestIds.add(id);
        }
      }
    }
    const lostRequests = lostRequestIds.size;

    const repeatedJobs =
      statusToRequestIds.get(RequestStatus.repeated)?.size ?? 0;

    const toDecimal = (value: unknown): number => {
      if (value === null || value === undefined) return 0;
      return Number(value);
    };

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

    const paymentsForRevenue = await this.prisma.payment.findMany({
      where: {
        paidAt: { gte: todayStart, lt: todayEnd },
        isActive: true,
      },
      select: {
        amount: true,
        currency: true,
        dollarExchangeRate: true,
      },
    });

    const totalRevenuesSyp = paymentsForRevenue.reduce((sum, payment) => {
      const amount = toDecimal(payment.amount);
      if (payment.currency === 'USD') {
        const rate = toDecimal(payment.dollarExchangeRate);
        return sum + amount * rate;
      }
      return sum + amount;
    }, 0);

    let salesSyp = 0;
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
    }

    const invoiceGroups = new Map<string, { invoice: any; payments: any[] }>();
    for (const payment of todayPayments) {
      const existing = invoiceGroups.get(payment.invoiceId);
      if (existing) {
        existing.payments.push(payment);
      } else {
        invoiceGroups.set(payment.invoiceId, {
          invoice: payment.invoice,
          payments: [payment],
        });
      }
    }

    let netProfitTodaySyp = 0;
    for (const { invoice, payments } of invoiceGroups.values()) {
      const netProfit = toDecimal(invoice.netProfit);
      if (invoice.totalCurrency === 'USD') {
        const sortedPayments = [...payments].sort(
          (a, b) => a.paidAt.getTime() - b.paidAt.getTime(),
        );
        const firstPayment = sortedPayments[0];
        const rate = toDecimal(firstPayment.dollarExchangeRate);
        netProfitTodaySyp += netProfit * rate;
      } else {
        netProfitTodaySyp += netProfit;
      }
    }

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
      notrepairableCount: lostRequests,
      externalInvoicesCount: externalInvoices,
      internalInvoicesCount: internalInvoices,
      newCustomersToday: newCustomersToday,
      totalRevenuesSyp: totalRevenuesSyp.toFixed(2),
      salesSyp: salesSyp.toFixed(2),
      netProfitTodaySyp: netProfitTodaySyp.toFixed(2),
      lastRequests,
    };
  }

  async getTechnicianPerformance(year?: number, month?: number, day?: number) {
    this.logger.log(`Fetching technician performance`);

    const now = toSyriaDate(new Date());
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetDay = day ?? now.getDate();

    const todayStart = new Date(targetYear, targetMonth - 1, targetDay);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const targetStatuses = [
      RequestStatus.completed,
      RequestStatus.incompleted,
      RequestStatus.pulltocenter,
      RequestStatus.accepted,
      RequestStatus.ontheway,
      RequestStatus.arrived,
      RequestStatus.underrepair,
    ];

    const terminalStatuses = new Set<RequestStatus>([
      RequestStatus.completed,
      RequestStatus.incompleted,
      RequestStatus.pulltocenter,
    ]);

    const technicians = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: 'Technician' } },
      select: { id: true, fullName: true, userNumber: true },
    });

    const technicianIds = technicians.map((t) => t.id);

    const todayChanges = await this.prisma.requestStatusHistory.findMany({
      where: {
        changedAt: { gte: todayStart, lt: todayEnd },
        status: { in: targetStatuses },
        isActive: true,
        changedBy: { not: null },
      },
      select: { requestId: true, status: true, changedBy: true },
    });

    const [relevantAssignments, todayPayments, todayInvoices] =
      await Promise.all([
        this.prisma.technicianAssignment.findMany({
          where: {
            isActive: true,
            requestId: { in: todayChanges.map((c) => c.requestId) },
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
        }),
        this.prisma.payment.findMany({
          where: {
            paidAt: { gte: todayStart, lt: todayEnd },
            isActive: true,
            isCollected: false,
          },
          include: {
            invoice: {
              include: {
                request: {
                  include: {
                    assignments: {
                      where: { isActive: true },
                      select: { technicianId: true },
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.invoice.findMany({
          where: {
            createdAt: { gte: todayStart, lt: todayEnd },
            isActive: true,
          },
          include: {
            request: {
              include: {
                assignments: {
                  where: { isActive: true },
                  select: { technicianId: true },
                },
              },
            },
            payments: {
              orderBy: { paidAt: 'asc' },
              take: 1,
            },
          },
        }),
      ]);

    const changesByRequestId = new Map<string, Set<RequestStatus>>();
    const changesByTechnicianId = new Map<string, Set<RequestStatus>>();
    for (const change of todayChanges) {
      const requestSet =
        changesByRequestId.get(change.requestId) || new Set<RequestStatus>();
      requestSet.add(change.status);
      changesByRequestId.set(change.requestId, requestSet);

      if (change.changedBy) {
        const techSet =
          changesByTechnicianId.get(change.changedBy) ||
          new Set<RequestStatus>();
        techSet.add(change.status);
        changesByTechnicianId.set(change.changedBy, techSet);
      }
    }

    const toDecimal = (value: unknown): number => {
      if (value === null || value === undefined) return 0;
      return Number(value);
    };

    const center = await this.prisma.centerSettings.findFirst();
    const exchangeRate = toDecimal(center?.dollarExchangeRate);

    const activeTechnicians = technicians.filter((tech) =>
      changesByTechnicianId.has(tech.id),
    );

    if (activeTechnicians.length === 0) {
      return {
        overall: {
          completedToday: 0,
          incompletedToday: 0,
          pulltocenterToday: 0,
          activeToday: 0,
          paymentsSypToday: 0,
          paymentsUsdToday: 0,
        },
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

    const techniciansResult = activeTechnicians.map((tech) => {
      const technicianChanges =
        changesByTechnicianId.get(tech.id) || new Set<RequestStatus>();
      const assignments = relevantAssignments.filter(
        (a) => a.technicianId === tech.id,
      );

      const completedCount = new Set(
        assignments
          .filter(() => technicianChanges.has(RequestStatus.completed))
          .map((a) => a.requestId),
      ).size;
      const incompletedCount = new Set(
        assignments
          .filter(() => technicianChanges.has(RequestStatus.incompleted))
          .map((a) => a.requestId),
      ).size;
      const pulltocenterCount = new Set(
        assignments
          .filter(() => technicianChanges.has(RequestStatus.pulltocenter))
          .map((a) => a.requestId),
      ).size;
      const activeCount = new Set(
        assignments
          .filter(
            () =>
              technicianChanges.has(RequestStatus.accepted) ||
              technicianChanges.has(RequestStatus.ontheway) ||
              technicianChanges.has(RequestStatus.arrived) ||
              technicianChanges.has(RequestStatus.underrepair),
          )
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
        const finalChange = request.statusHistory.find((h) =>
          terminalStatuses.has(h.status),
        );
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
      }

      for (const payment of todayPayments) {
        const isAssignedToTechnician =
          payment.invoice?.request?.assignments?.some(
            (a) => a.technicianId === tech.id,
          );
        if (isAssignedToTechnician) {
          if (!payment.isCollected) {
            if (payment.currency === 'SYP') {
              paymentsSyp += toDecimal(payment.amount);
            } else if (payment.currency === 'USD') {
              paymentsUsd += toDecimal(payment.amount);
            }
          }
        }
      }

      for (const invoice of todayInvoices) {
        const isAssignedToTechnician = invoice.request?.assignments?.some(
          (a) => a.technicianId === tech.id,
        );
        if (isAssignedToTechnician) {
          let invoiceTotalSyp: number;
          if (invoice.totalCurrency === 'USD') {
            const firstPayment = invoice.payments?.[0];
            const rate = firstPayment
              ? toDecimal(firstPayment.dollarExchangeRate)
              : exchangeRate;
            invoiceTotalSyp = toDecimal(invoice.totalAmount) * rate;
          } else {
            invoiceTotalSyp = toDecimal(invoice.totalAmount);
          }
          sales += invoiceTotalSyp;
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

    const overall = {
      completedToday: techniciansResult.reduce(
        (sum, t) => sum + t.completedCount,
        0,
      ),
      incompletedToday: techniciansResult.reduce(
        (sum, t) => sum + t.incompletedCount,
        0,
      ),
      pulltocenterToday: techniciansResult.reduce(
        (sum, t) => sum + t.pulltocenterCount,
        0,
      ),
      activeToday: techniciansResult.reduce((sum, t) => sum + t.activeCount, 0),
      paymentsSypToday: techniciansResult.reduce(
        (sum, t) => sum + t.paymentsSyp,
        0,
      ),
      paymentsUsdToday: techniciansResult.reduce(
        (sum, t) => sum + t.paymentsUsd,
        0,
      ),
    };

    return { overall, technicians: techniciansResult };
  }
}
