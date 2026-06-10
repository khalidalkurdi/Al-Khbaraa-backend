import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
@Controller('api/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully', type: InvoiceResponse })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async create(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.invoicesService.create(createInvoiceDto, user);
  }

  @Get()
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'List invoices with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'requestId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String, enum: ['internal', 'external'] })
  @ApiQuery({ name: 'status', required: false, type: String, enum: ['paid_full', 'paid_partial', 'refunded'] })
  @ApiResponse({ status: 200, description: 'Paginated list of invoices' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @ApiResponse({ status: 200, description: 'Invoice details', type: InvoiceDetailResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const user = req.user;
    const isTechnician = user.roles.includes('Technician');
    return this.invoicesService.findOne(id, user.id, isTechnician);
  }
}
