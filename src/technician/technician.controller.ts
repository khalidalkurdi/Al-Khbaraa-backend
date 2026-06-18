import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TechnicianService } from './technician.service';
import { MyRequestsQueryDto } from './dto/my-requests-query.dto';
import { UpdateTechnicianStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('technician')
@Controller('technician')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Technician')
export class TechnicianController {
  constructor(private readonly technicianService: TechnicianService) {}

  @Get('my-requests')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get repair requests assigned to the authenticated technician',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['new', 'active', 'complete', 'pull_to_center'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'تم إرجاع قائمة الطلبات' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - يتطلب دور الفني',
  })
  async myRequests(
    @Req() req: AuthenticatedRequest,
    @Query() query: MyRequestsQueryDto,
  ) {
    return this.technicianService.getMyRequests(req.user.id, query);
  }

  @Put('requests/:id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update status of an assigned request' })
  @ApiResponse({ status: 200, description: 'تم تحديث الحالة بنجاح' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح - حالة غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - يتطلب دور الفني',
  })
  @ApiResponse({
    status: 404,
    description: 'الطلب غير موجود أو غير مسند',
  })
  async updateStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() updateDto: UpdateTechnicianStatusDto,
  ) {
    return this.technicianService.updateStatusByTechnician(
      id,
      req.user.id,
      updateDto,
    );
  }
}
