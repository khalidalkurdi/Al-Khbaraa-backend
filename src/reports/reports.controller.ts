import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { ReportsService } from './reports.service';
import { ReportDateRangeQueryDto } from './dto/report-date-range-query.dto';
import { FinancialReportQueryDto } from './dto/financial-report-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('requests')
  @Roles('Admin')
  @ApiOperation({ summary: 'تقرير الطلبات لفترة زمنية (بحد أقصى 3 أشهر)' })
  @ApiQuery({ name: 'startDate', required: true, description: 'تاريخ البداية' })
  @ApiQuery({ name: 'endDate', required: true, description: 'تاريخ النهاية' })
  @ApiResponse({ status: 200, description: 'تقرير الطلبات' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح - فترة غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async requestsReport(@Query() query: ReportDateRangeQueryDto) {
    return this.reportsService.getRequestsReport(
      query.startDate,
      query.endDate,
    );
  }

  @Get('technicians')
  @Roles('Admin')
  @ApiOperation({ summary: 'تقارير الفنيين لفترة زمنية (بحد أقصى 3 أشهر)' })
  @ApiQuery({ name: 'startDate', required: true, description: 'تاريخ البداية' })
  @ApiQuery({ name: 'endDate', required: true, description: 'تاريخ النهاية' })
  @ApiResponse({ status: 200, description: 'تقارير الفنيين' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح - فترة غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async techniciansReport(@Query() query: ReportDateRangeQueryDto) {
    return this.reportsService.getTechniciansReport(
      query.startDate,
      query.endDate,
    );
  }

  @Get('inventory-movements')
  @Roles('Admin')
  @ApiOperation({
    summary: 'تقارير حركة المخزون لفترة زمنية (بحد أقصى 3 أشهر)',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'تاريخ البداية' })
  @ApiQuery({ name: 'endDate', required: true, description: 'تاريخ النهاية' })
  @ApiResponse({ status: 200, description: 'تقارير حركة المخزون' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح - فترة غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async inventoryMovementsReport(@Query() query: ReportDateRangeQueryDto) {
    return this.reportsService.getInventoryMovementsReport(
      query.startDate,
      query.endDate,
    );
  }

  @Get('financial')
  @Roles('Admin')
  @ApiOperation({ summary: 'التقارير المالية لفترة زمنية (بحد أقصى 3 أشهر)' })
  @ApiQuery({
    name: 'year',
    required: true,
    description: 'السنة',
    type: Number,
  })
  @ApiQuery({
    name: 'months',
    required: true,
    description: 'قائمة الأشهر (بحد أقصى 3 أشهر)',
    type: [Number],
    example: [1, 2, 3],
  })
  @ApiResponse({ status: 200, description: 'التقارير المالية' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح - فترة غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async financialReport(@Query() query: FinancialReportQueryDto) {
    return this.reportsService.getFinancialReport(query.year, query.months);
  }
}
