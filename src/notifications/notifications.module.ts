import { Module } from '@nestjs/common';
import { FirebaseAdminProvider } from './firebase-admin.provider';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [FirebaseAdminProvider, NotificationsService],
  exports: [FirebaseAdminProvider, NotificationsService],
})
export class NotificationsModule {}
