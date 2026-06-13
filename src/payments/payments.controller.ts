import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
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

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  @ApiResponse({
    status: 201,
    description: 'Payment recorded successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.paymentsService.create(createPaymentDto, user);
  }

  @Get('invoice/:invoiceId')
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiOperation({ summary: 'List payments for an invoice' })
  @ApiQuery({ name: 'currency', required: false, enum: ['SYP', 'USD'] })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    enum: ['cash', 'sham_cash'],
  })
  @ApiResponse({
    status: 200,
    description: 'Payment history list',
    type: [PaymentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findByInvoice(
    @Req() req: AuthenticatedRequest,
    @Param('invoiceId') invoiceId: string,
    @Query('currency') currency?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    const user = req.user;
    const isTechnician = user.roles.includes('Technician');
    return this.paymentsService.findByInvoice(
      invoiceId,
      user.id,
      isTechnician,
      currency,
      paymentMethod,
    );
  }
}
