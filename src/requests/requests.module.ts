import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { RequestNumberUtil } from './utils/request-number.util';

@Module({
  controllers: [RequestsController],
  providers: [RequestsService, RequestNumberUtil],
  exports: [RequestsService],
})
export class RequestsModule {}
