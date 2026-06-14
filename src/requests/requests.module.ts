import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { RequestRecordsController } from './request-records.controller';
import { RequestNumberUtil } from './utils/request-number.util';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfModule } from '../pdf/pdf.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  controllers: [RequestsController, RequestRecordsController],
  providers: [RequestsService, RequestNumberUtil],
  imports: [RealtimeModule, NotificationsModule, PdfModule, CustomersModule],
  exports: [RequestsService],
})
export class RequestsModule {}
