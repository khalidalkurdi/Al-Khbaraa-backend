import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { RequestNumberUtil } from './utils/request-number.util';
import {
  Prisma,
  RequestStatus,
  RequestType,
  Priority,
} from '@prisma/client';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private requestNumberUtil: RequestNumberUtil,
  ) {}

  async create(createRequestDto: CreateRequestDto, userId: string) {
    const {
      customerId,
      customer,
      type,
      priority,
      faultDescription,
      notes,
      scheduledDate,
      scheduledTime,
      devices,
    } = createRequestDto;

    if (!customerId && !customer) {
      throw new BadRequestException(
        'Either customerId or customer details must be provided',
      );
    }

    if (!devices || devices.length === 0) {
      throw new BadRequestException('At least one device is required');
    }

    let resolvedCustomerId = customerId;

    const result = await this.prisma.$transaction(async (tx) => {
      let createdCustomer: { id: string } | null = null;

      if (!customerId && customer) {
        const existingFirst = await tx.customer.findUnique({
          where: { firstPhone: customer.firstPhone },
        });
        if (existingFirst) {
          throw new ConflictException(
            'Customer with this first phone number already exists',
          );
        }

        if (customer.secondPhone) {
          const existingSecond = await tx.customer.findUnique({
            where: { secondPhone: customer.secondPhone },
          });
          if (existingSecond) {
            throw new ConflictException(
              'Customer with this second phone number already exists',
            );
          }
        }

        createdCustomer = await tx.customer.create({
          data: {
            name: customer.name,
            firstPhone: customer.firstPhone,
            secondPhone: customer.secondPhone,
            address: customer.address,
            locationLink: customer.locationLink,
            notes: customer.notes,
          },
        });

        resolvedCustomerId = createdCustomer.id;
      }

      if (!resolvedCustomerId) {
        throw new BadRequestException('Customer ID could not be resolved');
      }

      const requestNumber =
        await this.requestNumberUtil.generateUniqueRequestNumber();

      const request = await tx.request.create({
        data: {
          requestNumber,
          type: type as RequestType,
          customerId: resolvedCustomerId,
          priority: (priority as Priority) ?? 'medium',
          faultDescription,
          notes,
          scheduledDate: new Date(scheduledDate),
          scheduledTime: scheduledTime
            ? new Date(`1970-01-01T${scheduledTime}`)
            : null,
          createdBy: userId,
          devices: {
            create: devices.map((d) => ({
              deviceType: d.deviceType,
              deviceName: d.deviceName,
              brand: d.brand,
              model: d.model,
            })),
          },
        },
        include: {
          devices: true,
          customer: true,
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      if (!request) {
        throw new ConflictException('Failed to create request');
      }

      return { request, customer: createdCustomer };
    });

    return result.request;
  }

  async findAll(query: RequestQueryDto) {
    const {
      status,
      priority,
      type,
      customerId,
      scheduledDate,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.RequestWhereInput = {
      ...(status && { status: status as RequestStatus }),
      ...(priority && { priority: priority as Priority }),
      ...(type && { type: type as RequestType }),
      ...(customerId && { customerId }),
      ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          devices: true,
          customer: true,
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
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

  async findOne(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        devices: true,
        customer: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
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

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    return request;
  }

  async update(id: string, updateRequestDto: UpdateRequestDto) {
    const { devices, ...updateData } = updateRequestDto;

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.request.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Request with ID ${id} not found`);
      }

      const data: Prisma.RequestUpdateInput = {};

      if (Object.keys(updateData).length > 0) {
        if (updateData.scheduledDate) {
          (data as any).scheduledDate = new Date(
            updateData.scheduledDate as string,
          );
        }
        if (updateData.scheduledTime) {
          (data as any).scheduledTime = new Date(
            `1970-01-01T${updateData.scheduledTime}`,
          );
        }
        Object.assign(data, updateData);
      }

      if (devices && devices.length > 0) {
        await tx.requestDevice.deleteMany({
          where: { requestId: id },
        });
        (data as any).devices = {
          create: devices.map((d) => ({
            deviceType: d.deviceType,
            deviceName: d.deviceName,
            brand: d.brand,
            model: d.model,
          })),
        };
      }

      const updated = await tx.request.update({
        where: { id },
        data: data as any,
        include: {
          devices: true,
          customer: true,
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      return updated;
    });

    return result;
  }
}
