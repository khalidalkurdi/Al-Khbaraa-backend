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
import * as mm from 'music-metadata';
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
import { getSyriaNow } from '../common/utils/syria-date.util';

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
    const delay =
      this.getMillisecondsUntilNextRequestVoiceRecordCleanup(getSyriaNow());

    this.cleanupTimer = setTimeout(() => {
      void this.cleanupOldRequestVoiceRecords().finally(() => {
        this.scheduleNextRequestVoiceRecordCleanup();
      });
    }, delay);
  }

  private getMillisecondsUntilNextRequestVoiceRecordCleanup(now: Date) {
    const syriaNow = now;
    const nextRun = new Date(syriaNow);
    nextRun.setHours(5, 0, 0, 0);

    if (nextRun <= syriaNow) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.getTime() - syriaNow.getTime();
  }

  async cleanupOldRequestVoiceRecords() {
    const cutoffDate = getSyriaNow();
    const cutoffForQuery = new Date(cutoffDate);
    cutoffForQuery.setMonth(cutoffForQuery.getMonth() - 1);

    const records = await this.prisma.requestVoiceRecord.findMany({
      where: {
        createdAt: {
          lt: cutoffForQuery,
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
      customer,
      type,
      priority,
      faultDescription,
      notes,
      scheduledDate,
      devices,
      technicianId,
    } = createRequestDto;

    if (!customer) {
      throw new BadRequestException('يجب تقديم تفاصيل العميل');
    }

    if (!devices || devices.length === 0) {
      throw new BadRequestException('يجب إضافة جهاز واحد على الأقل');
    }

    let resolvedCustomerId;
    let generatedCustomerNumber: string | null = null;

    // Generate customer number before transaction if we need to create a customer
    if (customer) {
      generatedCustomerNumber =
        await this.customerNumberUtil.generateUniqueCustomerNumber();
    }

    let createdCustomer: { id: string } | null = null;

    if (customer && generatedCustomerNumber) {
      const whereCondition: any = {
        OR: [
          { firstPhone: customer.firstPhone },
          { secondPhone: customer.firstPhone },
        ],
      };

      if (customer.secondPhone) {
        whereCondition.OR.push(
          { firstPhone: customer.secondPhone },
          { secondPhone: customer.secondPhone },
        );
      }

      const existingCustomer = await this.prisma.customer.findFirst({
        where: whereCondition,
      });

      if (existingCustomer === null) {
        createdCustomer = await this.prisma.customer.create({
          data: {
            customerNumber: generatedCustomerNumber,
            name: customer.name,
            firstPhone: customer.firstPhone,
            secondPhone: customer.secondPhone,
            address: customer.address,
            locationLink: customer.locationLink,
          },
        });
      }

      resolvedCustomerId = createdCustomer
        ? createdCustomer.id
        : existingCustomer?.id;
    }

    if (resolvedCustomerId === null) {
      throw new BadRequestException('تعذر تحديد معرف العميل');
    }

    const result = await this.prisma.$transaction(async (tx) => {
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
          scheduledDate: scheduledDate
            ? new Date(scheduledDate)
            : getSyriaNow(),
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

    if (technicianId != null && technicianId != undefined) {
      await this.assignTechnician(result.request.id, technicianId, userId);
    }

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
          status: 'new',
          changedBy: userId,
        },
      });

      return assignment;
    });

    //bush notification to the assigned technician

    void this.notificationsService
      .sendPushNotification({
        userId: technicianId,
        title: 'تم تعيين طلب إصلاح جديد',
        body: `تم تعيين الطلب رقم #${request.requestNumber} إليك`,
      })
      .catch((error: any) => {
        this.logger.warn(`FCM push notification failed: ${error?.message}`);
      });

    return { assignment: result };
  }

  async uploadRequestVoiceRecords(
    requestId: string,
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('لم يتم تحميل ملفات صوتية');
    }

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requestNumber: true,
        status: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`الطلب رقم ${requestId} غير موجود`);
    }

    if (request.status === 'cancelled') {
      throw new BadRequestException('لا يمكن إضافة ملفات لطلب مكتمل أو ملغي');
    }

    const allowedExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const maxFilesCount = 10;

    if (files.length > maxFilesCount) {
      throw new BadRequestException(
        `يمكن رفع ${maxFilesCount} ملفات كحد أقصى في المرة الواحدة`,
      );
    }

    const recordFiles: Array<{
      file: Express.Multer.File;
      filename: string;
      originalName: string;
      size: number;
    }> = [];

    for (const file of files) {
      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `الملف "${file.originalname}" كبير جداً. الحد الأقصى هو ${maxFileSize / 1024 / 1024}MB`,
        );
      }

      const extension = this.getSafeFileExtension(file.originalname);

      if (!allowedExtensions.includes(extension)) {
        throw new BadRequestException(
          `الملف "${file.originalname}" غير صالح. الامتدادات المسموحة: ${allowedExtensions.join(', ')}`,
        );
      }

      const timestamp = Date.now();
      const uniqueId = randomUUID();
      const filename = `${timestamp}-${uniqueId}.${extension}`;

      recordFiles.push({
        file,
        filename,
        originalName: file.originalname,
        size: file.size,
      });
    }

    const requestRecordsDir = path.join(this.recordsDir, request.requestNumber);

    try {
      fs.mkdirSync(requestRecordsDir, { recursive: true });
    } catch (error) {
      throw new InternalServerErrorException('فشل إنشاء مجلد الملفات');
    }

    const savedRecords: Array<{
      requestId: string;
      fullFilePath: string;
      fileSize: number | null;
      mimeType: string | null;
      duration: number | null;
    }> = [];

    const errors: Array<{
      filename: string;
      error: string;
    }> = [];

    for (const { file, filename, originalName, size } of recordFiles) {
      try {
        const filePath = path.join(requestRecordsDir, filename);

        fs.writeFileSync(filePath, file.buffer);

        let duration: number | null = null;
        try {
          duration = await this.getAudioDuration(file.buffer);
        } catch (error) {
          console.warn('فشل حساب مدة الصوت:', error);
        }

        savedRecords.push({
          requestId: request.id,
          fullFilePath: `/uploads/Records/${request.requestNumber}/${filename}`,
          fileSize: size,
          mimeType: file.mimetype || null,
          duration: duration,
        });
      } catch (error: any) {
        errors.push({
          filename: originalName,
          error: error.message,
        });
      }
    }

    if (errors.length > 0 && savedRecords.length === 0) {
      throw new InternalServerErrorException(
        `فشل حفظ جميع الملفات: ${errors.map((e) => e.filename).join(', ')}`,
      );
    }

    try {
      if (savedRecords.length > 0) {
        await this.prisma.requestVoiceRecord.createMany({
          data: savedRecords,
          skipDuplicates: true,
        });
      }

      this.logger.log(
        `تم رفع ${savedRecords.length} ملف صوتي للطلب ${request.requestNumber}`,
      );
    } catch (error) {
      for (const record of savedRecords) {
        try {
          const fileName = path.basename(record.fullFilePath);
          const filePath = path.join(requestRecordsDir, fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (unlinkError) {
          console.error('فشل حذف الملف:', unlinkError);
        }
      }

      throw new InternalServerErrorException(
        'فشل حفظ الملفات الصوتية في قاعدة البيانات',
      );
    }

    const result = await this.prisma.requestVoiceRecord.findMany({
      where: {
        requestId: request.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      success: true,
      message: `تم رفع ${savedRecords.length} ملف صوتي بنجاح`,
      data: {
        records: result,
        totalUploaded: savedRecords.length,
        totalErrors: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        request: {
          id: request.id,
          number: request.requestNumber,
        },
      },
    };
  }
  private async getAudioDuration(buffer: Buffer): Promise<number | null> {
    try {
      const metadata = await mm.parseBuffer(buffer, undefined, {
        duration: true,
        skipCovers: true,
        skipPostHeaders: true,
      });

      if (metadata.format.duration) {
        return Math.round(metadata.format.duration);
      }
      return null;
    } catch (error) {
      console.warn('فشل حساب مدة الصوت:', error.message);
      return null;
    }
  }
  private getSafeFileExtension(filename: string): string {
    if (!filename || !filename.includes('.')) {
      return '';
    }

    const parts = filename.split('.');
    const extension = parts[parts.length - 1].toLowerCase().trim();

    return extension.split('?')[0].split('#')[0];
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
            fullName: true,
          },
        },
      },
    });

    return history;
  }
  async findAll(query: RequestQueryDto) {
    const { status, priority, type, startDate, endDate, page, limit, search } =
      query;

    const where: any = {};

    if (status) where.status = status;
    if (status === RequestStatus.repeated) {
      where.status = undefined;
      where.isRepeated = true;
    }

    if (priority) where.priority = priority;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        {
          requestNumber: {
            contains: search,
          },
        },
        {
          customer: {
            is: {
              OR: [
                {
                  firstPhone: {
                    contains: search,
                  },
                },
                {
                  secondPhone: {
                    contains: search,
                  },
                },
                {
                  name: {
                    contains: search,
                  },
                },
              ],
            },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          devices: true,
          customer: true,
          assignments: {
            where: {
              isActive: true,
            },
            include: {
              technician: {
                select: {
                  fullName: true,
                  userNumber: true,
                },
              },
            },
            orderBy: {
              assignedAt: 'desc',
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
      }),
      this.prisma.request.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        devices: true,
        customer: true,
        invoice: {
          include: {
            payments: true,
          },
        },
        assignments: {
          where: {
            isActive: true,
          },
          include: {
            technician: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
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
            customerNumber: true,
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
      scheduledDate: request.scheduledDate as Date,
      priority: request.priority,
      status: request.status,
      customer: {
        id: request.customer.id,
        name: request.customer.name,
        firstPhone: request.customer.firstPhone,
        secondPhone: request.customer.secondPhone ?? undefined,
        address: request.customer.address ?? undefined,
      },
      creator: request.creator
        ? { id: request.creator.id, fullName: request.creator.fullName }
        : undefined,
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

  async update(id: string, updateRequestDto: UpdateRequestDto, userId: string) {
    const { devices, customer, technicianId, ...updateData } = updateRequestDto;

    const existing = await this.prisma.request.findUnique({
      where: { id },
      include: {
        assignments: {
          where: {
            isActive: true,
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException(`طلب بالمعرف ${id} غير موجود`);
    }
    const unAllowedStatuses: RequestStatus[] = [
      RequestStatus.ontheway,
      RequestStatus.underrepair,
      RequestStatus.arrived,
    ];

    if (technicianId != undefined) {
      if (existing.assignments.length > 0) {
        if (existing.assignments[0].technicianId != technicianId) {
          if (unAllowedStatuses.includes(existing.status)) {
            throw new BadRequestException(
              `لا يمكن تغيير الفني للطلب في حالة ${existing.status}`,
            );
          }
          await this.assignTechnician(id, technicianId, userId);
        }
      } else {
        await this.assignTechnician(id, technicianId, userId);
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (customer) {
        const existingCustomer = await tx.customer.findFirst({
          where: {
            OR: [
              { firstPhone: customer.firstPhone },
              { secondPhone: customer.firstPhone },
              { firstPhone: customer.secondPhone },
              { secondPhone: customer.secondPhone },
            ],
          },
        });

        if (existingCustomer) {
          await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              name: customer.name,
              firstPhone: customer.firstPhone,
              secondPhone: customer.secondPhone,
              address: customer.address,
              locationLink: customer.locationLink,
            },
          });
        } else {
          const newCustomer = await tx.customer.create({
            data: {
              customerNumber:
                await this.customerNumberUtil.generateUniqueCustomerNumber(),
              name: customer.name,
              firstPhone: customer.firstPhone,
              secondPhone: customer.secondPhone,
              address: customer.address,
              locationLink: customer.locationLink,
            },
          });
        }
      }
      const data: Prisma.RequestUpdateInput = {};

      if (Object.keys(updateData).length > 0) {
        if (updateData.scheduledDate) {
          (data as any).scheduledDate = new Date(updateData.scheduledDate);
          delete updateData.scheduledDate;
        }
        if (
          existing.status !== RequestStatus.completed &&
          updateData.status === RequestStatus.completed
        ) {
          (data as any).isCompleted = true;
        }
        if (
          existing.status === RequestStatus.completed &&
          updateData.status === RequestStatus.new
        ) {
          (data as any).isRepeated = true;
        }
        Object.assign(data, updateData);
        Object.keys(data).forEach((key) => {
          if ((data as any)[key] === undefined) {
            delete (data as any)[key];
          }
        });
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
          statusHistory: {
            orderBy: { changedAt: 'desc' },
          },
        },
      });

      if (existing.status !== updated.status) {
        await tx.requestStatusHistory.create({
          data: {
            requestId: id,
            status: updated.status,
            changedBy: userId,
          },
        });
      }
      return updated;
    });

    return result;
  }
}
