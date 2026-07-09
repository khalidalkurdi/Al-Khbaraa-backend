import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Logger,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceDetailResponse } from './dto/invoice-detail-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { SettingsService } from 'src/settings/settings.service';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly settingsService: SettingsService,
  ) {}

  @Post()
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء الفاتورة بنجاح',
  })
  @ApiResponse({
    status: 400,
    description:
      'طلب غير صالح - خطأ في التحقق من صحة البيانات أو مخزون غير كافٍ',
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - الصلاحيات غير كافية',
  })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.invoicesService.create(createInvoiceDto, user);
  }

  @Get()
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'List invoices with pagination' })
  @ApiResponse({ status: 200, description: 'قائمة الفواتير مع الترقيم' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: InvoiceQueryDto,
  ) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiOperation({ summary: 'Get invoice details by ID' })
  @ApiResponse({
    status: 200,
    description: 'تفاصيل الفاتورة',
    type: InvoiceDetailResponse,
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  @ApiResponse({ status: 404, description: 'الفاتورة غير موجودة' })
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const user = req.user;
    const isTechnician = user.role === 'Technician';
    return this.invoicesService.findOne(id, user.id, isTechnician);
  }

  @Post(':id/refund')
  @Roles('Admin')
  @ApiOperation({ summary: 'Refund an invoice (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'تم استرجاع الفاتورة بنجاح',
  })
  @ApiResponse({ status: 400, description: 'الفاتورة غير قابلة للاسترجاع' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحيات غير كافية' })
  @ApiResponse({ status: 404, description: 'الفاتورة غير موجودة' })
  async refund(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const user = req.user;
    return this.invoicesService.refund(id, user);
  }

  @Get(':id/pdf')
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate invoice PDF' })
  @ApiResponse({
    status: 200,
    description: 'تم إرجاع بيانات الفاتورة ',
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  @ApiResponse({ status: 404, description: 'الفاتورة غير موجودة' })
  async getInvoicePdfData(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const user = req.user;
    const isTechnician = user.role === 'Technician';
    const invoice = await this.invoicesService.getInvoicePdfData(
      id,
      user.id,
      isTechnician,
    );
    const settings = await this.settingsService.getSettings();
    return { settings, invoice };
  }
}
