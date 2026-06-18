import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAdminProvider } from './firebase-admin.provider';
import { NotificationListQueryDto } from './dto/notification-list-query.dto';
import { getSyriaNow } from '../common/utils/syria-date.util';

export interface SendPushNotificationInput {
  userId: string;
  title: string;
  body: string;
}

export interface SendPushNotificationResult {
  notificationId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdminProvider: FirebaseAdminProvider,
  ) {}

  async sendPushNotification(
    input: SendPushNotificationInput,
  ): Promise<SendPushNotificationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, tokenDevice: true, isActive: true },
    });

    if (!user) {
      throw new NotFoundException(`المستخدم ${input.userId} غير موجود`);
    }

    if (!user.isActive) {
      throw new BadRequestException(`المستخدم ${input.userId} غير نشط`);
    }

    const deviceToken = user.tokenDevice?.trim();

    if (!deviceToken) {
      return this.persistNotification(input);
    }

    if (!this.firebaseAdminProvider.isEnabled()) {
      return this.persistNotification(input);
    }

    const messaging = this.firebaseAdminProvider.getMessaging();

    if (!messaging) {
      return this.persistNotification(input);
    }

    try {
      await messaging.send({
        token: deviceToken,
        notification: {
          title: input.title,
          body: input.body,
        },
        android: {
          priority: 'high',
        },
      });

      return this.persistNotification(input);
    } catch (error) {
      const fcmError = this.extractFcmError(error);
      this.logger.warn(`FCM push failed for user ${input.userId}: ${fcmError}`);

      if (fcmError === 'messaging/registration-token-not-registered') {
        await this.prisma.user.update({
          where: { id: input.userId },
          data: { tokenDevice: '' },
        });
      }

      return this.persistNotification(input);
    }
  }

  async listNotifications(userId: string, query: NotificationListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { userId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async countUnread(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`الإشعار ${id} غير موجود`);
    }

    if (existing.userId !== userId) {
      throw new NotFoundException(`الإشعار ${id} غير موجود`);
    }

    if (existing.isRead) {
      return existing;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: getSyriaNow(),
      },
    });
  }

  private async persistNotification(
    input: SendPushNotificationInput,
  ): Promise<SendPushNotificationResult> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
      },
    });

    return {
      notificationId: notification.id,
    };
  }

  private extractFcmError(error: unknown): string {
    const maybeError = error as {
      errorInfo?: { code?: string };
      code?: string;
      message?: string;
    };

    return (
      maybeError.errorInfo?.code ??
      maybeError.code ??
      `unknown_fcm_error: ${maybeError.message ?? 'unknown'}`
    );
  }
}
