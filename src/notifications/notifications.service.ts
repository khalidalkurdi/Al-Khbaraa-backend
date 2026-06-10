import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendPushNotification(userId: string, title: string, _body: string) {
    this.logger.log(`FCM placeholder for user ${userId}: ${title}`);
    return Promise.resolve();
  }
}
