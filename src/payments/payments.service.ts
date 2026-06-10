import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, user: AuthenticatedUser) {
    const { invoiceId, amount, currency, paymentMethod, notes } =
      createPaymentDto;

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        totalCurrency: true,
        requestId: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const isTechnician = user.roles.includes('Technician');
    if (isTechnician) {
      const assignment = await this.prisma.technicianAssignment.findFirst({
        where: {
          requestId: invoice.requestId,
          technicianId: user.id,
          isActive: true,
        },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not assigned to this request');
      }
    }

    let dollarExchangeRate: number = 1;
    let convertedAmount = Number(amount);

    if (currency !== invoice.totalCurrency) {
      const settings = await this.prisma.getCenterSettings();
      if (!settings) {
        throw new BadRequestException('Exchange rate not configured');
      }
      dollarExchangeRate = Number(settings.dollarExchangeRate);

      if (currency === 'USD' && invoice.totalCurrency === 'SYP') {
        convertedAmount = amount * dollarExchangeRate;
      } else if (currency === 'SYP' && invoice.totalCurrency === 'USD') {
        convertedAmount = amount / dollarExchangeRate;
      }
    }

    const newPaidAmount = Number(invoice.paidAmount) + convertedAmount;
    const newRemainingAmount =
      Number(invoice.remainingAmount) - convertedAmount;
    const statusChanged =
      invoice.status === 'paid_partial' && newRemainingAmount <= 0;
    const newStatus = statusChanged ? 'paid_full' : invoice.status;

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          invoiceId,
          amount,
          currency,
          paymentMethod,
          dollarExchangeRate,
          convertedAmount,
          notes: notes ?? null,
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
        },
      });

      return {
        payment: createdPayment,
        invoice: updatedInvoice,
        statusChanged,
      };
    });

    this.realtimeGateway.sendToAll('payment.recorded', {
      paymentId: payment.payment.id,
      invoiceId,
      amount,
      currency,
      convertedAmount,
      newPaidAmount,
      newRemainingAmount,
      statusChanged,
    });

    if (statusChanged) {
      this.realtimeGateway.sendToAll('invoice.status.updated', {
        invoiceId,
        oldStatus: invoice.status,
        newStatus,
      });
    }

    this.logger.log(
      `Payment ${payment.payment.id} created for invoice ${invoiceId}, amount: ${amount} ${currency}`,
    );

    return payment.payment;
  }

  async findByInvoice(
    invoiceId: string,
    userId: string,
    isTechnician: boolean,
    currency?: string,
    paymentMethod?: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, requestId: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (isTechnician) {
      const assignment = await this.prisma.technicianAssignment.findFirst({
        where: {
          requestId: invoice.requestId,
          technicianId: userId,
          isActive: true,
        },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not assigned to this request');
      }
    }

    return this.prisma.payment.findMany({
      where: {
        invoiceId,
        ...(currency && { currency }),
        ...(paymentMethod && { paymentMethod }),
      },
      orderBy: { paidAt: 'desc' },
    });
  }
}
