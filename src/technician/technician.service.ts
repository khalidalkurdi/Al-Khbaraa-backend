import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MyRequestsQueryDto,
  TechnicianRequestStatusFilter,
} from './dto/my-requests-query.dto';
import { UpdateTechnicianStatusDto } from './dto/update-status.dto';
import { RequestStatus } from '@prisma/client';
import { skip } from 'node:test';
import { toSyriaDate } from '../common/utils/syria-date.util';

@Injectable()
export class TechnicianService {
  private readonly logger = new Logger(TechnicianService.name);

  constructor(private prisma: PrismaService) {}

  private getStatusFilterValues(
    filter: TechnicianRequestStatusFilter,
  ): RequestStatus[] {
    switch (filter) {
      case TechnicianRequestStatusFilter.NEW:
        return [RequestStatus.new];
      case TechnicianRequestStatusFilter.ACTIVE:
        return [
          RequestStatus.accepted,
          RequestStatus.ontheway,
          RequestStatus.arrived,
          RequestStatus.underrepair,
        ];
      case TechnicianRequestStatusFilter.INCOMPLETED:
        return [RequestStatus.incompleted];
      case TechnicianRequestStatusFilter.COMPLETED:
        return [RequestStatus.completed];
      case TechnicianRequestStatusFilter.PULL_TO_CENTER:
        return [RequestStatus.pulltocenter];
      case TechnicianRequestStatusFilter.REPEATED:
        return [RequestStatus.repeated];
      default:
        return [];
    }
  }

  async getMyRequests(technicianId: string, query: MyRequestsQueryDto) {
    const { status, page, limit } = query;
    let skip;
    if (page !== undefined && limit !== undefined) {
      skip = (page - 1) * limit;
    }

    const where: any = {
      assignments: {
        some: {
          technicianId,
          isActive: true,
        },
      },
    };

    if (status) {
      const reqStatus = this.getStatusFilterValues(status);
      if (reqStatus[0] !== RequestStatus.repeated) {
        where.status = { in: reqStatus };
      } else {
        where.isRepeated = true;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.request.findMany({
        where: { ...where, isActive: true },
        skip,
        take: limit,
        orderBy: [{ priority: 'asc' }, { scheduledDate: 'asc' }],
        include: {
          customer: true,
          devices: true,
        },
      }),
      this.prisma.request.count({ where: { ...where, isActive: true } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async updateStatusByTechnician(
    requestId: string,
    technicianId: string,
    updateDto: UpdateTechnicianStatusDto,
  ) {
    const { status, notes } = updateDto;

    const assignment = await this.prisma.technicianAssignment.findFirst({
      where: {
        requestId,
        technicianId,
        isActive: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('الطلب غير موجود أو غير مسند إلى هذا الفني');
    }

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`طلب بالمعرف ${requestId} غير موجود`);
    }

    const statusOrder = {
      new: 0,
      accepted: 1,
      ontheway: 2,
      arrived: 3,
      notrepairable: 4,
      postponed: 4,
      cancelled: 4,
      notanswer: 4,
      underrepair: 5,
      pulltocenter: 6,
      completed: 6,
      incompleted: 6,
    };

    const currentStatus = request.status;
    const currentOrder = statusOrder[currentStatus];
    const newOrder = statusOrder[status];

    if (newOrder === undefined) {
      throw new BadRequestException(`حالة غير معروفة: ${status}`);
    }
    if (currentOrder === newOrder) {
      throw new BadRequestException(`الطلب بالفعل في الحالة ${status}`);
    }
    if (newOrder < currentOrder) {
      throw new BadRequestException(
        `لا يمكن الرجوع إلى حالة أقل (${status}) من الحالة الحالية (${currentStatus})`,
      );
    }

    const finalStates = ['completed', 'incompleted', 'pulltocenter'];
    if (finalStates.includes(currentStatus) && currentStatus !== status) {
      throw new BadRequestException(
        `لا يمكن تغيير الحالة بعد الوصول إلى حالة نهائية (${currentStatus})`,
      );
    }
    if (
      currentStatus === RequestStatus.cancelled ||
      currentStatus === RequestStatus.postponed ||
      currentStatus === RequestStatus.notanswer ||
      currentStatus === RequestStatus.notrepairable
    ) {
      await this.prisma.technicianAssignment.update({
        where: { id: assignment.id },
        data: { isActive: false },
      });
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.request.update({
        where: { id: requestId },
        data: { status: status },
        include: {
          customer: true,
          devices: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 10,
            include: {
              changer: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          status: status,
          notes: notes ? notes : null,
          changedBy: technicianId,
        },
      });

      return updated;
    });

    return { message: 'تم تحديث حالة الطلب بنجاح' };
  }

  async getMyWalletAmount(technicianId: string) {
    const inventory = await this.prisma.technicianInventory.findFirst({
      where: { technicianId },
      select: { id: true, walletAmount: true },
    });

    if (!inventory) {
      throw new NotFoundException('مخزون الفني غير موجود');
    }

    const assignments = await this.prisma.technicianAssignment.findMany({
      where: {
        technicianId,
        isActive: true,
      },
      select: {
        requestId: true,
      },
    });

    const requestIds = assignments.map((a) => a.requestId);

    const [invoiceItems, walletMovements, inventoryItems, todayPayments] =
      await Promise.all([
        this.prisma.invoiceItem.findMany({
          where: {
            invoice: {
              requestId: { in: requestIds },
            },
            isActive: true,
          },
          include: {
            sparePart: {
              select: {
                id: true,
                name: true,
              },
            },
            invoice: {
              select: {
                invoiceNumber: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            id: 'desc',
          },
          take: 10,
        }),
        this.prisma.walletMovement.findMany({
          where: {
            technicianInventoryId: inventory.id,
          },
          include: {
            responsible: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        }),
        this.prisma.technicianInventoryItem.findMany({
          where: {
            technicianInventoryId: inventory.id,
          },
          include: {
            sparePart: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            sparePart: {
              name: 'asc',
            },
          },
        }),
        (async () => {
          const now = toSyriaDate(new Date());
          const todayStart = new Date(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
          );
          const todayEnd = new Date(todayStart);
          todayEnd.setDate(todayEnd.getDate() + 1);

          return this.prisma.payment.findMany({
            where: {
              paidAt: { gte: todayStart, lt: todayEnd },
              isActive: true,
              invoice: {
                requestId: { in: requestIds },
              },
            },
            select: {
              amount: true,
              currency: true,
            },
          });
        })(),
      ]);

    let paymentsSyp = 0;
    let paymentsUsd = 0;
    for (const payment of todayPayments) {
      if (payment.currency === 'SYP') {
        paymentsSyp += Number(payment.amount);
      } else if (payment.currency === 'USD') {
        paymentsUsd += Number(payment.amount);
      }
    }

    const items = inventoryItems.map((item) => ({
      id: item.id,
      name: item.sparePart.name,
      quantity: item.quantity,
    }));

    const soldItems = invoiceItems.map((item) => ({
      id: item.id,
      name: item.sparePart.name,
      quantity: item.quantity,
      reference: item.invoice.invoiceNumber,
      soldAt: item.invoice.createdAt,
    }));

    const movements = walletMovements.map((movement) => ({
      id: movement.id,
      amount: Number(movement.amount),
      type: movement.type,
      notes: movement.notes,
      createdAt: movement.createdAt,
    }));

    return {
      walletAmount: Number(inventory.walletAmount),
      technicianInventoryId: inventory.id,
      items,
      latestSoldItems: soldItems,
      latestWalletMovements: movements,
      paymentsSyp,
      paymentsUsd,
    };
  }
}
