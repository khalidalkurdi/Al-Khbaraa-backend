import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { Prisma, RequestStatus, RequestType, Priority } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import type { RequestReceiptPdfData } from '../pdf/pdf.types';
import { RequestNumberUtil } from './utils/request-number.util';
import { CustomerNumberUtil } from '../customers/utils/customer-number.util';

@Injectable()
export class RequestsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RequestsService.name);
  private readonly recordsDir = path.join(process.cwd(), 'uploads', 'Records');
  private readonly allowedRecordMimeTypes = ['audio/mp3', 'audio/mp4'];
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(
    private prisma: PrismaService,
    private requestNumberUtil: RequestNumberUtil,
    private customerNumberUtil: CustomerNumberUtil,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.scheduleNextRequestVoiceRecordCleanup();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private scheduleNextRequestVoiceRecordCleanup() {
    const delay = this.getMillisecondsUntilNextRequestVoiceRecordCleanup(
      new Date(),
    );

    this.cleanupTimer = setTimeout(() => {
      void this.cleanupOldRequestVoiceRecords().finally(() => {
        this.scheduleNextRequestVoiceRecordCleanup();
      });
    }, delay);
  }

  private getMillisecondsUntilNextRequestVoiceRecordCleanup(now: Date) {
    const nextRun = new Date(now);
    nextRun.setHours(5, 0, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.getTime() - now.getTime();
  }

  async cleanupOldRequestVoiceRecords() {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);

    const records = await this.prisma.requestVoiceRecord.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        fullFilePath: true,
      },
    });

    if (records.length === 0) {
      this.logger.log('No expired request voice records found');
      return {
        deletedRecords: 0,
        deletedFiles: 0,
      };
    }

    const removableRecordIds: string[] = [];
    let deletedFiles = 0;

    for (const record of records) {
      const filePath = this.resolveRequestVoiceRecordPath(record.fullFilePath);

      if (!filePath) {
        removableRecordIds.push(record.id);
        continue;
      }

      try {
        fs.rmSync(filePath, { force: true, recursive: true });
        deletedFiles++;
        removableRecordIds.push(record.id);
        this.removeEmptyRequestVoiceRecordDirectories(filePath);
      } catch (error) {
        this.logger.warn(
          `Failed to delete expired request voice record file: ${record.fullFilePath}`,
        );
      }
    }

    if (removableRecordIds.length === 0) {
      return {
        deletedRecords: 0,
        deletedFiles,
      };
    }

    try {
      const result = await this.prisma.requestVoiceRecord.deleteMany({
        where: {
          id: {
            in: removableRecordIds,
          },
        },
      });

      this.logger.log(`Deleted ${result.count} expired request voice records`);

      return {
        deletedRecords: result.count,
        deletedFiles,
      };
    } catch (error) {
      this.logger.error(
        'Failed to delete expired request voice records from database',
        error,
      );
      throw error;
    }
  }

  private resolveRequestVoiceRecordPath(fullFilePath: string) {
    if (!fullFilePath || !fullFilePath.startsWith('/uploads/Records/')) {
      return null;
    }

    const uploadRoot = path.resolve(process.cwd(), 'uploads');
    const relativePath = fullFilePath.replace(/^\/+/, '');
    const absolutePath = path.resolve(uploadRoot, relativePath);

    if (
      absolutePath !== uploadRoot &&
      !absolutePath.startsWith(`${uploadRoot}${path.sep}`)
    ) {
      return null;
    }

    return absolutePath;
  }

  private removeEmptyRequestVoiceRecordDirectories(filePath: string) {
    const recordDirectory = path.dirname(filePath);

    try {
      if (fs.readdirSync(recordDirectory).length !== 0) {
        return;
      }

      fs.rmdirSync(recordDirectory);

      if (recordDirectory === this.recordsDir) {
        return;
      }

      const parentDirectory = path.dirname(recordDirectory);

      if (
        parentDirectory !== this.recordsDir &&
        fs.existsSync(parentDirectory) &&
        fs.readdirSync(parentDirectory).length === 0
      ) {
        fs.rmdirSync(parentDirectory);
      }
    } catch {
      return;
    }
  }

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
      throw new BadRequestException('يجب تقديم customerId أو تفاصيل العميل');
    }

    if (!devices || devices.length === 0) {
      throw new BadRequestException('يجب إضافة جهاز واحد على الأقل');
    }

    let resolvedCustomerId = customerId;
    let generatedCustomerNumber: string | null = null;

    // Generate customer number before transaction if we need to create a customer
    if (!customerId && customer) {
      generatedCustomerNumber =
        await this.customerNumberUtil.generateUniqueCustomerNumber();
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let createdCustomer: { id: string } | null = null;

      if (!customerId && customer && generatedCustomerNumber) {
        const existingFirst = await tx.customer.findUnique({
          where: { firstPhone: customer.firstPhone },
        });
        if (existingFirst) {
          throw new ConflictException(
            'يوجد عميل بهذا الرقم الأول للهاتف بالفعل',
          );
        }

        if (customer.secondPhone) {
          const existingSecond = await tx.customer.findUnique({
            where: { secondPhone: customer.secondPhone },
          });
          if (existingSecond) {
            throw new ConflictException(
              'يوجد عميل بهذا الرقم الثاني للهاتف بالفعل',
            );
          }
        }

        createdCustomer = await tx.customer.create({
          data: {
            customerNumber: generatedCustomerNumber,
            name: customer.name,
            firstPhone: customer.firstPhone,
            secondPhone: customer.secondPhone,
            address: customer.address,
            locationLink: customer.locationLink,
          },
        });

        resolvedCustomerId = createdCustomer.id;
      }

      if (!resolvedCustomerId) {
        throw new BadRequestException('تعذر تحديد معرف العميل');
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
        throw new ConflictException('فشل إنشاء الطلب');
      }

      return { request, customer: createdCustomer };
    });

    return result.request;
  }

  async assignTechnician(id: string, technicianId: string, userId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: { customer: true, creator: true, devices: true },
    });

    if (!request) {
      throw new NotFoundException(`طلب بالمعرف ${id} غير موجود`);
    }

    const technician = await this.prisma.user.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new BadRequestException('الفني غير موجود');
    }

    if (!technician.isActive) {
      throw new BadRequestException('لا يمكن إسناد فني غير نشط');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.technicianAssignment.updateMany({
        where: { requestId: id, isActive: true },
        data: { isActive: false },
      });

      const assignment = await tx.technicianAssignment.create({
        data: {
          requestId: id,
          technicianId,
          assignedBy: userId,
        },
        include: {
          technician: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId: id,
          status: 'accepted',
          changedBy: userId,
        },
      });

      return assignment;
    });

    this.realtimeGateway.sendToUser(technicianId, 'request.assigned', {
      type: 'request.assigned',
      data: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        technicianId,
        assignedBy: {
          id: userId,
          fullName: (request.creator as any)?.fullName ?? 'Unknown',
        },
        assignedAt: result.assignedAt,
      },
    });

    this.realtimeGateway.sendToAll('request.status_changed', {
      type: 'request.status_changed',
      data: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        status: 'accepted',
        changedBy: {
          id: userId,
          fullName: (request.creator as any)?.fullName ?? 'Unknown',
        },
        changedAt: new Date(),
      },
    });

    void this.notificationsService
      .sendPushNotification({
        userId: technicianId,
        title: 'New repair request assigned',
        body: `Request #${request.requestNumber} has been assigned to you.`,
      })
      .catch((error: any) => {
        this.logger.warn(`FCM push notification failed: ${error?.message}`);
      });

    return { assignment: result };
  }

  async uploadRequestVoiceRecords(
    requestNumber: string,
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('لم يتم تحميل ملفات صوتية');
    }

    const request = await this.prisma.request.findUnique({
      where: { requestNumber },
      select: { id: true, requestNumber: true },
    });

    if (!request) {
      throw new NotFoundException(`طلب ${requestNumber} غير موجود`);
    }

    const recordFiles = files.map((file) => {
      if (!this.allowedRecordMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'نوع الملف غير صالح. يسمح فقط بالملفات الصوتية.',
        );
      }

      const extension = this.getSafeFileExtension(file.originalname);
      const filename = `${Date.now()}-${randomUUID()}${extension}`;

      return {
        file,
        filename,
      };
    });

    const requestRecordsDir = path.join(this.recordsDir, request.requestNumber);
    fs.mkdirSync(requestRecordsDir, { recursive: true });

    const records = recordFiles.map(({ file, filename }) => {
      const filePath = path.join(requestRecordsDir, filename);
      fs.writeFileSync(filePath, file.buffer);

      return {
        requestId: request.id,
        fullFilePath: `/uploads/Records/${request.requestNumber}/${filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    });

    try {
      await this.prisma.requestVoiceRecord.createMany({ data: records });
    } catch {
      throw new InternalServerErrorException('فشل حفظ الملفات الصوتية');
    }

    return this.prisma.requestVoiceRecord.findMany({
      where: {
        requestId: request.id,
        fullFilePath: {
          in: records.map((record) => record.fullFilePath),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getSafeFileExtension(originalname: string) {
    const extension = path.extname(originalname).toLowerCase();

    if (/^\.[a-z0-9]{1,8}$/.test(extension)) {
      return extension;
    }

    return '.m4a';
  }

  async getStatusHistory(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`طلب بالمعرف ${id} غير موجود`);
    }

    const history = await this.prisma.requestStatusHistory.findMany({
      where: { requestId: id },
      orderBy: { changedAt: 'desc' },
      include: {
        changer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return history;
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
      ...(status && { status: status }),
      ...(priority && { priority: priority }),
      ...(type && { type: type }),
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
      throw new NotFoundException(`طلب بالمعرف ${id} غير موجود`);
    }

    return request;
  }

  async getRequestReceiptPdfData(id: string): Promise<RequestReceiptPdfData> {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        devices: true,
        customer: {
          select: {
            id: true,
            name: true,
            firstPhone: true,
            secondPhone: true,
            address: true,
          },
        },
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
      throw new NotFoundException(`طلب بالمعرف ${id} غير موجود`);
    }

    return {
      id: request.id,
      requestNumber: request.requestNumber,
      createdAt: request.createdAt,
      scheduledDate: request.scheduledDate,
      scheduledTime: request.scheduledTime,
      priority: request.priority,
      status: request.status,
      customer: {
        id: request.customer.id,
        name: request.customer.name,
        firstPhone: request.customer.firstPhone,
        secondPhone: request.customer.secondPhone ?? undefined,
        address: request.customer.address ?? undefined,
      },
      creator: request.creator,
      devices: request.devices.map((device) => ({
        id: device.id,
        deviceType: device.deviceType,
        deviceName: device.deviceName,
        brand: device.brand ?? undefined,
        model: device.model ?? undefined,
      })),
      faultDescription: request.faultDescription,
      notes: request.notes ?? undefined,
    };
  }

  async update(id: string, updateRequestDto: UpdateRequestDto) {
    const { devices, ...updateData } = updateRequestDto;

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.request.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`طلب بالمعرف ${id} غير موجود`);
      }

      const data: Prisma.RequestUpdateInput = {};

      if (Object.keys(updateData).length > 0) {
        if (updateData.scheduledDate) {
          (data as any).scheduledDate = new Date(updateData.scheduledDate);
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
