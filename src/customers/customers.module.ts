import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerNumberUtil } from './utils/customer-number.util';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomerNumberUtil],
  exports: [CustomersService, CustomerNumberUtil],
})
export class CustomersModule {}
