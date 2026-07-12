import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { AssignTechnicianBulkDto } from './dto/assign-technician-bulk.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SettingsService } from 'src/settings/settings.service';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('requests')
@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new repair request' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  @ApiResponse({
    status: 400,
    description: 'طلب غير صالح - خطأ في التحقق من صحة البيانات',
  })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - صلاحيات الدور غير كافية',
  })
  async create(
    @Body() createRequestDto: CreateRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requestsService.create(createRequestDto, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List repair requests with filters' })
  @ApiResponse({ status: 200, description: 'تم إرجاع قائمة الطلبات' })
  @ApiResponse({
    status: 403,
    description: 'ممنوح - صلاحيات الدور غير كافية',
  })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() requestQueryDto: RequestQueryDto,
  ) {
    const isTechnician = req.user.role === 'Technician';
    return this.requestsService.findAll(
      requestQueryDto,
      req.user.id,
      isTechnician,
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get repair request by ID' })
  @ApiResponse({ status: 200, description: 'تم إرجاع الطلب' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const isTechnician = req.user.role === 'Technician';
    return this.requestsService.findOne(id, req.user.id, isTechnician);
  }

  @Get(':id/pdf')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate request receipt PDF' })
  @ApiResponse({
    status: 200,
    description: 'تم إرجاع معلومات الطلب PDF',
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوح' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async getRequestReceiptPdfData(@Param('id') id: string) {
    const request = await this.requestsService.getRequestReceiptPdfData(id);
    const settings = this.settingsService.getSettings();
    return { settings, request };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update repair request' })
  @ApiResponse({ status: 200, description: 'تم تحديث الطلب' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async update(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.requestsService.update(
      id,
      updateRequestDto,
      req.user.id,
      req.user.role,
    );
  }

  @Get(':id/status-history')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get status history timeline for a repair request' })
  @ApiResponse({ status: 200, description: 'تم إرجاع سجل الحالة' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  @ApiResponse({
    status: 403,
    description: 'ممنوح - صلاحيات الدور غير كافية',
  })
  async getStatusHistory(@Param('id') id: string) {
    return this.requestsService.getStatusHistory(id);
  }

  @Post('assign-bulk')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign multiple requests to a technician' })
  @ApiResponse({ status: 201, description: 'تم إسناد الطلبات إلى الفني بنجاح' })
  @ApiResponse({
    status: 400,
    description: 'بيانات غير صالحة - فني غير موجود أو غير نشط',
  })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - صلاحيات الدور غير كافية',
  })
  @ApiResponse({ status: 200, description: 'تم إسناد الطلبات الموجودة وإرجاع الطلبات غير الموجودة' })
  async assignBulk(
    @Body() assignTechnicianBulkDto: AssignTechnicianBulkDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { requestIds, technicianId } = assignTechnicianBulkDto;
    return this.requestsService.assignTechnicianBulk(
      requestIds,
      technicianId,
      req.user.id,
    );
  }
}
