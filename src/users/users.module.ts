import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserNumberUtil } from './utils/user-number.util';

@Module({
  providers: [UsersService, UserNumberUtil],
  exports: [UsersService, UserNumberUtil],
  controllers: [UsersController],
})
export class UsersModule {}
