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
    role: string;
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
    description: 'تم تسجيل الدفعة بنجاح',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'طلب غير صالح - خطأ في التحقق من صحة البيانات',
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - الصلاحيات غير كافية',
  })
  @ApiResponse({ status: 404, description: 'الفاتورة غير موجودة' })
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
    description: 'سجل الدفعات',
    type: [PaymentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  @ApiResponse({ status: 404, description: 'الفاتورة غير موجودة' })
  async findByInvoice(
    @Req() req: AuthenticatedRequest,
    @Param('invoiceId') invoiceId: string,
    @Query('currency') currency?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    const user = req.user;
    const isTechnician = user.role === 'Technician';
    return this.paymentsService.findByInvoice(
      invoiceId,
      user.id,
      isTechnician,
      currency,
      paymentMethod,
    );
  }
}
