import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PayrollRecordsService } from './payroll-records.service';
import { CreatePayrollRecordDto } from './dto/create-payroll-record.dto';
import { PayrollRecordsQueryDto } from './dto/payroll-records-query.dto';

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
  async createPayrollRecord(@Body() dto: CreatePayrollRecordDto) {
    return this.payrollRecordsService.createPayrollRecord(dto);
  }

  @Get()
  @Roles('Admin')
  @ApiOperation({ summary: 'List payroll records with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'قائمة سجلات الرواتب',
    type: [Object],
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async findAll(@Query() query: PayrollRecordsQueryDto) {
    return this.payrollRecordsService.findAll(query);
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
