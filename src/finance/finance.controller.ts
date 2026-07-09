import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FinanceService } from './finance.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { FinanceDateQueryDto } from './dto/finance-date-query.dto';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('expenses')
  @Roles('Admin')
  @ApiOperation({ summary: 'Create a new expense record' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المصروف بنجاح' })
  @ApiResponse({
    status: 400,
    description: 'طلب غير صالح - خطأ في التحقق من صحة البيانات',
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - الصلاحيات غير كافية',
  })
  async createExpense(
    @Body() dto: CreateExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.financeService.createExpense(dto, user);
  }

  @Get('expenses')
  @Roles('Admin')
  @ApiOperation({ summary: 'List expense records with optional filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'قائمة المصروفات', type: [Object] })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async findExpenses(
    @Query('type') type?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.financeService.findExpenses({ type, month, year });
  }

  @Get('expenses/:id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiResponse({
    status: 200,
    description: 'تم العثور على المصروف',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'المصروف غير موجود' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async findExpenseById(@Param('id') id: string) {
    return this.financeService.findExpenseById(id);
  }

  @Patch('expenses/:id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update expense by ID' })
  @ApiResponse({ status: 200, description: 'تم تحديث المصروف', type: Object })
  @ApiResponse({ status: 404, description: 'المصروف غير موجود' })
  @ApiResponse({
    status: 400,
    description: 'طلب غير صالح - خطأ في التحقق من صحة البيانات',
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.financeService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Delete expense by ID' })
  @ApiResponse({ status: 204, description: 'تم حذف المصروف' })
  @ApiResponse({ status: 404, description: 'المصروف غير موجود' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async deleteExpense(@Param('id') id: string) {
    await this.financeService.deleteExpense(id);
  }

  @Get('summary')
  @Roles('Admin')
  @ApiOperation({
    summary: 'تقرير المبيعات والأرباح لفواتير تاريخ محدد',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'التاريخ (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'تقرير المبيعات والأرباح', type: Object })
  @ApiResponse({ status: 400, description: 'طلب غير صالح - تاريخ غير صالح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async salesProfits(@Query() query: FinanceDateQueryDto) {
    return this.financeService.getSalesProfits(query.date);
  }

  @Get('reports/pdf')
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate financial report PDF for a date range' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'تم إرجاع مستند PDF',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 400, description: 'طلب غير صالح - تواريخ غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async generateReportPdf(
    @Query() query: FinanceSummaryQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.financeService.getFinancialReportPdfData(
      query.startDate,
      query.endDate,
    );
    return data;
  }
}
