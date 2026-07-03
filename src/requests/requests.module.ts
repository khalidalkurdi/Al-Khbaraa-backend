import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { RequestRecordsController } from './request-records.controller';
import { RequestNumberUtil } from './utils/request-number.util';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CustomersModule } from '../customers/customers.module';
import { SettingsService } from 'src/settings/settings.service';

@Module({
  controllers: [RequestsController, RequestRecordsController],
  providers: [RequestsService, RequestNumberUtil, SettingsService],
  imports: [RealtimeModule, NotificationsModule, CustomersModule],
  exports: [RequestsService],
})
export class RequestsModule {}
