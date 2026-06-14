import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationListQueryDto } from './dto/notification-list-query.dto';
import { NotificationAlertResponseDto } from './dto/notification-alert-response.dto';
import { NotificationPageResponseDto } from './dto/notification-page-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List authenticated user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'تم إرجاع سجل الإشعارات',
    type: NotificationPageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'رمز JWT مفقود أو غير صالح' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: NotificationListQueryDto,
  ) {
    return this.notificationsService.listNotifications(req.user.id, query);
  }

  @Get('alert')
  @ApiOperation({ summary: 'Return unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'تم إرجاع عدد الإشعارات غير المقروءة',
    type: NotificationAlertResponseDto,
  })
  @ApiResponse({ status: 401, description: 'رمز JWT مفقود أو غير صالح' })
  async alert(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.countUnread(req.user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({
    status: 200,
    description: 'تم تعليم الإشعار كمقروء',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'معرف الإشعار غير صالح' })
  @ApiResponse({ status: 401, description: 'رمز JWT مفقود أو غير صالح' })
  @ApiResponse({ status: 404, description: 'الإشعار غير موجود' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}
