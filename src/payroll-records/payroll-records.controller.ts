import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PayrollRecordsService } from './payroll-records.service';
import { CreatePayrollRecordDto } from './dto/create-payroll-record.dto';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

@ApiTags('Payroll Records')
@ApiBearerAuth()
@Controller('payroll-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollRecordsController {
  constructor(private readonly payrollRecordsService: PayrollRecordsService) {}

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Create a new payroll record' })
  @ApiResponse({ status: 201, description: 'تم إنشاء سجل الراتب بنجاح' })
  @ApiResponse({
    status: 400,
    description: 'طلب غير صالح - خطأ في التحقق من صحة البيانات',
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحيات غير كافية' })
  async createPayrollRecord(
    @Body() dto: CreatePayrollRecordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.payrollRecordsService.createPayrollRecord(dto, user);
  }

  @Get()
  @Roles('Admin')
  @ApiOperation({ summary: 'List payroll records with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'قائمة سجلات الرواتب',
    type: [Object],
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.payrollRecordsService.findAll({
      page: pageNum,
      limit: limitNum,
    });
  }

  @Delete(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Delete payroll record by ID' })
  @ApiResponse({ status: 204, description: 'تم حذف سجل الراتب' })
  @ApiResponse({ status: 404, description: 'سجل الراتب غير موجود' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async deletePayrollRecord(@Param('id') id: string) {
    await this.payrollRecordsService.deletePayrollRecord(id);
  }
}
