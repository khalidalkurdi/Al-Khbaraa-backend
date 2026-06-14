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
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PdfModule } from '../pdf/pdf.module';
import { PdfService } from '../pdf/pdf.service';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceResponse } from './dto/invoice-response.dto';
import { InvoiceDetailResponse } from './dto/invoice-detail-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    roles: string[];
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
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء الفاتورة بنجاح',
    type: InvoiceResponse,
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
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'requestId', required: false, type: String })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    enum: ['internal', 'external'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['paid_full', 'paid_partial', 'refunded'],
  })
  @ApiResponse({ status: 200, description: 'قائمة الفواتير مع الترقيم' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('requestId') requestId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const user = req.user;
    const isTechnician = user.roles.includes('Technician');
    return this.invoicesService.findAll(
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '20', 10),
      user.id,
      isTechnician,
    );
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
    const isTechnician = user.roles.includes('Technician');
    return this.invoicesService.findOne(id, user.id, isTechnician);
  }

  @Get(':id/pdf')
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate invoice PDF' })
  @ApiResponse({
    status: 200,
    description: 'تم إرجاع مستند PDF',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  @ApiResponse({ status: 404, description: 'الفاتورة غير موجودة' })
  async generatePdf(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = req.user;
    const isTechnician = user.roles.includes('Technician');
    const invoice = await this.invoicesService.getInvoicePdfData(
      id,
      user.id,
      isTechnician,
    );
    const result = await this.pdfService.generateInvoicePdf(invoice, {
      documentType: 'invoice',
      filename: `invoice-${invoice.invoiceNumber}`,
    });

    response.setHeader('Content-Type', result.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    response.setHeader('Cache-Control', 'private, no-cache');
    response.setHeader('Content-Length', result.buffer.length);
    response.send(result.buffer);
  }
}
