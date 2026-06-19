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
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PdfService } from '../pdf/pdf.service';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
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

@ApiTags('requests')
@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly pdfService: PdfService,
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
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List repair requests with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'scheduledDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'تم إرجاع قائمة الطلبات' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - صلاحيات الدور غير كافية',
  })
  async findAll(@Query() requestQueryDto: RequestQueryDto) {
    return this.requestsService.findAll(requestQueryDto);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get repair request by ID' })
  @ApiResponse({ status: 200, description: 'تم إرجاع الطلب' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Get(':id/pdf')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate request receipt PDF' })
  @ApiResponse({
    status: 200,
    description: 'تم إرجاع مستند PDF',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async generatePdf(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const request = await this.requestsService.getRequestReceiptPdfData(id);
    const result = await this.pdfService.generateRequestReceiptPdf(request, {
      documentType: 'request_receipt',
      filename: `request-${request.requestNumber}`,
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
    return this.requestsService.update(id, updateRequestDto, req.user.id);
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
    description: 'ممنوع - صلاحيات الدور غير كافية',
  })
  async getStatusHistory(@Param('id') id: string) {
    return this.requestsService.getStatusHistory(id);
  }
}
