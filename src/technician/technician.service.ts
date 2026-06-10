import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MyRequestsQueryDto,
  TechnicianRequestStatusFilter,
} from './dto/my-requests-query.dto';
import { UpdateTechnicianStatusDto } from './dto/update-status.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class TechnicianService {
  private readonly logger = new Logger(TechnicianService.name);

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

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
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
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
          customer: {
            select: {
              id: true,
              name: true,
              firstPhone: true,
            },
          },
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
    const { status } = updateDto;

    const assignment = await this.prisma.technicianAssignment.findFirst({
      where: {
        requestId,
        technicianId,
        isActive: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Request not found or not assigned to this technician',
      );
    }

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
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
          changedBy: technicianId,
        },
      });

      return updated;
    });

    this.realtimeGateway.sendToUser(technicianId, 'request.status_changed', {
      type: 'request.status_changed',
      data: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        status: status,
        changedBy: { id: technicianId },
        changedAt: new Date(),
      },
    });

    this.realtimeGateway.sendToAll('request.status_changed', {
      type: 'request.status_changed',
      data: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        status: status,
        changedBy: { id: technicianId },
        changedAt: new Date(),
      },
    });

    return result;
  }
}
