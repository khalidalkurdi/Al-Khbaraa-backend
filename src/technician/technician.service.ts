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
      case TechnicianRequestStatusFilter.COMPLETE:
        return [
          RequestStatus.completed,
          RequestStatus.incompleted,
          RequestStatus.notrepairable,
        ];
      case TechnicianRequestStatusFilter.PULL_TO_CENTER:
        return [RequestStatus.pulltocenter];
      default:
        return [];
    }
  }

  async getMyRequests(technicianId: string, query: MyRequestsQueryDto) {
    const { status, isRepeated, page, limit } = query;
    let skip;
    if (page !== undefined && limit !== undefined) {
      skip = (page - 1) * limit;
    }

    const where: any = {
      isRepeated: isRepeated ?? false,
      assignments: {
        some: {
          technicianId,
          isActive: true,
        },
      },
    };

    if (status) {
      where.status = { in: this.getStatusFilterValues(status) };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'asc' }, { scheduledDate: 'asc' }],
        include: {
          customer: true,
          devices: true,
        },
      }),
      this.prisma.request.count({ where }),
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

    return result;
  }
}
