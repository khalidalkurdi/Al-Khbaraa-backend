import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserNumberUtil } from './utils/user-number.util';
import { ImageNumberUtil } from './utils/image-number.util';

@Module({
  providers: [UsersService, UserNumberUtil, ImageNumberUtil],
  exports: [UsersService, UserNumberUtil, ImageNumberUtil],
  controllers: [UsersController],
})
export class UsersModule {}
