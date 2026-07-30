import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceNumberUtil } from './utils/invoice-number.util';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import {
  InvoiceStatus,
  InvoiceType,
  MovementType,
  RequestType,
  Prisma,
  RequestStatus,
} from '@prisma/client';
import { CurrencyEnum } from './enums/currency.enum';
import { MovementsService } from 'src/inventory/movements.service';
import { CreateStockMovementDto } from 'src/inventory/dto/create-stock-movement.dto';
import { PaymentsService } from 'src/payments/payments.service';
import { CreatePaymentDto } from 'src/payments/dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceQueryDto } from './dto/invoice-query.dto';

function toDecimal(value: string | number | Decimal): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly paymentsService: PaymentsService,
    private readonly invoiceNumberUtil: InvoiceNumberUtil,
    private readonly movementsService: MovementsService,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, user: AuthenticatedUser) {
    const request = await this.prisma.request.findUnique({
      where: { id: createInvoiceDto.requestId },
      select: { id: true, type: true, status: true, customerId: true },
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }
    const allowedStatuses: RequestStatus[] = [
      RequestStatus.completed,
      RequestStatus.incompleted,
      RequestStatus.pulltocenter,
    ];
    if (!allowedStatuses.includes(request.status)) {
      throw new BadRequestException(
        'يجب تحديث حالة الطلب الى مكتمل او غير مكتمل او مسحوب للمركز قبل انشاء الفاتورة',
      );
    }

    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { requestId: createInvoiceDto.requestId },
      select: { id: true, invoiceNumber: true, status: true },
    });

    if (existingInvoice) {
      if (existingInvoice.status === InvoiceStatus.paid) {
        throw new BadRequestException(
          'الطلب لديه فاتورة مدفوعة بالكامل بالفعل',
        );
      }
      if (existingInvoice.status === InvoiceStatus.paid_partial) {
        throw new BadRequestException('الطلب لديه فاتورة غير مكتملة');
      }
    }

    const isTechnician = user.role === 'Technician';
    if (isTechnician) {
      const assignment = await this.prisma.technicianAssignment.findFirst({
        where: {
          requestId: createInvoiceDto.requestId,
          technicianId: user.id,
          isActive: true,
        },
      });
      if (!assignment) {
        throw new ForbiddenException('لست مسنداً إلى هذا الطلب');
      }
    }

    const {
      payment,
      locationURL,
      requestId,
      items,
      status,
      totalAmount,
      warrantyPeriod,
      notes,
      needsCenterMaintenance,
    } = createInvoiceDto;

    let stockMap = new Map();
    let totalPrice = 0;

    const validateStock = async (client: Prisma.TransactionClient) => {
      if (!items || items.length === 0) return;
      const spareParts = await client.sparePart.findMany({
        where: {
          id: { in: items.map((i) => i.sparePartId) },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          costUsd: true,
          costSyp: true,
        },
      });
      stockMap = new Map(spareParts.map((sp) => [sp.id, sp]));

      for (const item of items) {
        const part = stockMap.get(item.sparePartId);
        if (!part) {
          throw new BadRequestException(
            `قطعة الغيار ${item.sparePartId} غير موجودة أو غير نشطة`,
          );
        }
        const qty = item.quantity ?? 1;
        if (part.quantity < qty) {
          throw new BadRequestException(
            `المخزون غير كافٍ لـ ${part.name}: المتاح ${part.quantity}، والمطلوب ${qty}`,
          );
        }
      }

      totalPrice = items.reduce((sum, item) => {
        const qty = item.quantity ?? 1;
        const price = item.unitPrice ?? 0;
        return sum + qty * price;
      }, 0);
    };

    const calculateCost = (currency: CurrencyEnum) => {
      if (!items || items.length === 0) return 0;
      const costField = currency === CurrencyEnum.SYP ? 'costSyp' : 'costUsd';

      return items.reduce((sum, item) => {
        const qty = item.quantity ?? 1;
        const stock = stockMap.get(item.sparePartId);
        const cost = Number(stock?.[costField]) ?? 0;
        return sum + qty * cost;
      }, 0);
    };
    const totalCurrency = payment.currency;
    const invoiceStatus =
      totalAmount - payment.amount === 0
        ? InvoiceStatus.paid
        : InvoiceStatus.paid_partial;

    const paidAmount = payment.amount;
    const remainingAmount = totalAmount - paidAmount;

    if (invoiceStatus != status) {
      throw new BadRequestException('الحالة غير مطابقة للمدفوع');
    }
    const type =
      request.type === RequestType.external
        ? InvoiceType.external
        : InvoiceType.internal;

    const invoice = await this.prisma.$transaction(
      async (tx) => {
        await validateStock(tx);

        const totalCost = calculateCost(totalCurrency);
        const totalCostSyp = calculateCost(CurrencyEnum.SYP);
        const netProfit = totalAmount - totalCost;

        const invoiceNumber = await this.generateUniqueInvoiceNumber();
        const createdInvoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            request: { connect: { id: requestId } },
            type,
            status: invoiceStatus,
            netProfit,
            totalCostSyp,
            totalAmount,
            totalCurrency,
            paidAmount,
            remainingAmount,
            warrantyPeriod: warrantyPeriod ?? null,
            needsCenterMaintenance: needsCenterMaintenance ?? null,
            notes: notes ?? null,
            ...(items &&
              items.length > 0 && {
                items: {
                  create: items.map((item) => ({
                    sparePartId: item.sparePartId,
                    quantity: item.quantity ?? 1,
                    unitPrice: item.unitPrice ?? 0,
                    currency: totalCurrency,
                    totalPrice: (item.unitPrice ?? 0) * (item.quantity ?? 1),
                  })),
                },
              }),
          },
        });

        // movement
        if (items && items.length > 0) {
          for (const item of items) {
            const dto: CreateStockMovementDto = {
              partId: item.sparePartId,
              movementType: MovementType.sale,
              quantity: item.quantity,
              reference: 'استهلاك فواتير',
            };
            await this.movementsService.create(dto, user.id, tx);
          }
        }

        const dto: CreatePaymentDto = {
          ...payment,
          invoiceId: createdInvoice.id,
        };
        //create first payment
        const invoiceWithPayments = await this.paymentsService.create(
          dto,
          user,
          tx,
        );

        if (locationURL !== undefined) {
          await tx.customer.update({
            where: { id: request.customerId },
            data: { locationLink: locationURL },
          });
        }
        this.logger.log(
          `Invoice ${createdInvoice.invoiceNumber} created for request ${requestId}`,
        );
        await tx.request.update({
          where: { id: createInvoiceDto.requestId },
          data: {
            hasInvoice: true,
            isCompleted: invoiceStatus === InvoiceStatus.paid ? true : false,
          },
        });

        return invoiceWithPayments;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, user: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        totalCurrency: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        isActive: true,
        netProfit: true,
        totalCostSyp: true,
        requestId: true,
        request: {
          select: { id: true, status: true },
        },
        items: {
          where: { isActive: true },
          select: {
            id: true,
            sparePartId: true,
            quantity: true,
            unitPrice: true,
            currency: true,
            totalPrice: true,
          },
        },
        payments: {
          where: { isActive: true },
          select: {
            id: true,
            amount: true,
            currency: true,
            convertedAmount: true,
            dollarExchangeRate: true,
            paymentMethod: true,
          },
          orderBy: { paidAt: 'asc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }

    if (invoice.status === InvoiceStatus.refunded) {
      throw new BadRequestException('لا يمكن تحديث فاتورة مسترجعة');
    }

    if (!invoice.isActive) {
      throw new BadRequestException('الفاتورة غير نشطة');
    }

    if (invoice.request) {
      const blockedRequestStatuses: RequestStatus[] = [
        RequestStatus.cancelled,
        RequestStatus.notanswer,
        RequestStatus.notrepairable,
      ];
      if (blockedRequestStatuses.includes(invoice.request.status)) {
        throw new BadRequestException(
          'لا يمكن تحديث الفاتورة لحالة الطلب الحالية',
        );
      }
    }

    const firstPayment = invoice.payments[0];
    if (!firstPayment) {
      throw new BadRequestException('لا توجد دفعة لهذه الفاتورة');
    }

    const {
      totalAmount,
      paidAmount,
      warrantyPeriod,
      notes,
      needsCenterMaintenance,
      items,
    } = dto;

    const invoiceUpdateData: Prisma.InvoiceUpdateInput = {};
    if (warrantyPeriod !== undefined)
      invoiceUpdateData.warrantyPeriod = warrantyPeriod;
    if (needsCenterMaintenance !== undefined)
      invoiceUpdateData.needsCenterMaintenance = needsCenterMaintenance;
    if (notes !== undefined) invoiceUpdateData.notes = notes;

    const settings = await this.prisma.centerSettings.findFirst();
    const rate =
      invoice.payments[0].dollarExchangeRate ?? settings?.dollarExchangeRate;

    return this.prisma.$transaction(async (tx) => {
      const requestInTx = await tx.request.findUnique({
        where: { id: invoice.requestId },
        select: { id: true, status: true },
      });
      if (requestInTx) {
        const blockedStatuses: RequestStatus[] = [
          RequestStatus.cancelled,
          RequestStatus.notanswer,
          RequestStatus.notrepairable,
        ];
        if (blockedStatuses.includes(requestInTx.status)) {
          throw new BadRequestException(
            'لا يمكن تحديث الفاتورة لحالة الطلب الحالية',
          );
        }
      }

      let currentTotalAmount = toDecimal(invoice.totalAmount);
      const currentTotalCurrency = invoice.totalCurrency as CurrencyEnum;
      let currentPaidAmount = toDecimal(invoice.paidAmount);
      let stockMap = new Map<
        string,
        { quantity: number; costUsd: number; costSyp: number; name: string }
      >();

      if (items && items.length > 0) {
        const existingItems = invoice.items;
        const existingById = new Map(
          existingItems.map((item) => [item.id, item]),
        );

        const allSparePartIds = [
          ...new Set(
            items
              .filter((item) => item.id && item.sparePartId)
              .map((item) => item.sparePartId!),
          ),
        ];

        if (allSparePartIds.length === 0) {
          const existingSparePartIds = existingItems
            .filter((item) => items.some((i) => i.id === item.id))
            .map((item) => item.sparePartId);
          allSparePartIds.push(...existingSparePartIds);
        }

        const uniqueSparePartIds = [
          ...new Set(allSparePartIds.filter((id) => id)),
        ];

        if (uniqueSparePartIds.length > 0) {
          const spareParts = await tx.sparePart.findMany({
            where: {
              id: { in: uniqueSparePartIds },
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              quantity: true,
              costUsd: true,
              costSyp: true,
            },
          });
          stockMap = new Map(
            spareParts.map((sp) => [
              sp.id,
              {
                quantity: sp.quantity,
                costUsd: Number(sp.costUsd),
                costSyp: Number(sp.costSyp),
                name: sp.name,
              },
            ]),
          );
        }

        for (const item of items) {
          if (!item.id) continue;
          const existing = existingById.get(item.id);
          if (!existing) {
            throw new BadRequestException(
              `العنصر ${item.id} غير موجود في الفاتورة`,
            );
          }

          const sparePartId = item.sparePartId ?? existing.sparePartId;
          const part = stockMap.get(sparePartId);
          if (!part) {
            throw new BadRequestException(
              `قطعة الغيار ${sparePartId} غير موجودة أو غير نشطة`,
            );
          }

          const newQty = item.quantity ?? existing.quantity;
          const qtyDiff = newQty - existing.quantity;

          if (qtyDiff > 0) {
            if (part.quantity < qtyDiff) {
              throw new BadRequestException(
                `المخزون غير كافٍ لـ ${part.name}: المتاح ${part.quantity}، والمطلوب إضافي ${qtyDiff}`,
              );
            }
            const dto: CreateStockMovementDto = {
              partId: sparePartId,
              movementType: MovementType.sale,
              quantity: qtyDiff,
              reference: 'تعديل فاتورة - زيادة كمية',
            };
            await this.movementsService.create(dto, user.id, tx);
          } else if (qtyDiff < 0) {
            const dto: CreateStockMovementDto = {
              partId: sparePartId,
              movementType: MovementType.return,
              quantity: Math.abs(qtyDiff),
              reference: 'تعديل فاتورة - تقليل كمية',
            };
            await this.movementsService.create(dto, user.id, tx);
          }

          const newUnitPrice = item.unitPrice ?? existing.unitPrice;
          const newTotalPrice = Number(newUnitPrice) * newQty;

          await tx.invoiceItem.update({
            where: { id: item.id },
            data: {
              quantity: newQty,
              unitPrice: newUnitPrice,
              totalPrice: newTotalPrice,
            },
          });
        }
      }

      if (paidAmount !== undefined) {
        const safeRate = new Decimal(rate);
        const newAmount = toDecimal(paidAmount);

        const paymentCurrency = firstPayment.currency as CurrencyEnum;
        let convertedAmount = newAmount;
        if (
          paymentCurrency === CurrencyEnum.USD &&
          currentTotalCurrency === CurrencyEnum.SYP
        ) {
          convertedAmount = newAmount.times(safeRate);
        } else if (
          paymentCurrency === CurrencyEnum.SYP &&
          currentTotalCurrency === CurrencyEnum.USD
        ) {
          convertedAmount = newAmount.dividedBy(safeRate);
        }

        await tx.payment.update({
          where: { id: firstPayment.id },
          data: {
            convertedAmount: convertedAmount,
            amount: newAmount,
          },
        });
      }

      if (totalAmount !== undefined) {
        const newTotal = toDecimal(totalAmount);
        if (newTotal.lessThanOrEqualTo(0)) {
          throw new BadRequestException(
            'المبلغ الإجمالي يجب أن يكون أكبر من 0',
          );
        }
        currentTotalAmount = newTotal;
        invoiceUpdateData.totalAmount = newTotal;
      }

      const allPayments = await tx.payment.findMany({
        where: { invoiceId: id, isActive: true },
        select: { convertedAmount: true },
      });

      let totalPaidFromPayments = new Decimal(0);
      for (const p of allPayments) {
        totalPaidFromPayments = totalPaidFromPayments.plus(
          toDecimal(p.convertedAmount),
        );
      }

      if (paidAmount !== undefined) {
        const newPaid = toDecimal(paidAmount);
        if (newPaid.lessThan(0)) {
          throw new BadRequestException(
            'المبلغ المدفوع لا يمكن أن يكون سالباً',
          );
        }
        currentPaidAmount = newPaid;
      } else {
        currentPaidAmount = totalPaidFromPayments;
      }

      const activeItems = await tx.invoiceItem.findMany({
        where: { invoiceId: id, isActive: true },
        select: { sparePartId: true, quantity: true },
      });

      const allSparePartIds = [
        ...new Set(activeItems.map((i) => i.sparePartId)),
      ];
      if (allSparePartIds.length > 0) {
        const spareParts = await tx.sparePart.findMany({
          where: { id: { in: allSparePartIds }, isActive: true },
          select: { id: true, costUsd: true, costSyp: true },
        });
        stockMap = new Map(
          spareParts.map((sp) => [
            sp.id,
            {
              quantity: 0,
              costUsd: Number(sp.costUsd),
              costSyp: Number(sp.costSyp),
              name: '',
            },
          ]),
        );
      }

      const totalCost = activeItems.reduce((sum, item) => {
        const qty = item.quantity;
        const stock = stockMap.get(item.sparePartId);
        const costField =
          currentTotalCurrency === CurrencyEnum.USD ? 'costUsd' : 'costSyp';
        const cost = Number(stock?.[costField] ?? 0);
        return sum + qty * cost;
      }, 0);

      const totalCostSyp = activeItems.reduce((sum, item) => {
        const qty = item.quantity;
        const stock = stockMap.get(item.sparePartId);
        const cost = Number(stock?.costSyp ?? 0);
        return sum + qty * cost;
      }, 0);

      const netProfit = currentTotalAmount.minus(totalCost);
      invoiceUpdateData.totalCostSyp = totalCostSyp;
      invoiceUpdateData.netProfit = netProfit;

      const newPaidAmount = currentPaidAmount;
      const newRemainingAmount = currentTotalAmount.minus(newPaidAmount);
      const newStatus = newRemainingAmount.lessThanOrEqualTo(0)
        ? InvoiceStatus.paid
        : newPaidAmount.greaterThan(0)
          ? InvoiceStatus.paid_partial
          : InvoiceStatus.paid_partial;

      if (newPaidAmount.greaterThan(currentTotalAmount)) {
        throw new BadRequestException('المبلغ المدفوع يتجاوز المبلغ الإجمالي');
      }

      if (newRemainingAmount.lessThan(0)) {
        throw new BadRequestException('المبلغ المتبقي لا يمكن أن يكون سالباً');
      }

      if (
        invoice.status === InvoiceStatus.paid &&
        newRemainingAmount.greaterThan(0)
      ) {
        throw new BadRequestException(
          'لا يمكن تحديث فاتورة مدفوعة بالكامل مع وجود مبلغ متبقي',
        );
      }

      if (Object.keys(invoiceUpdateData).length > 0) {
        await tx.invoice.update({
          where: { id },
          data: invoiceUpdateData,
        });
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
        },
        include: {
          items: true,
          payments: true,
          request: true,
        },
      });

      this.logger.log(
        `Invoice ${updatedInvoice.invoiceNumber} updated by user ${user.id}`,
      );

      return updatedInvoice;
    });
  }

  async refund(id: string, user: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: { id: true, status: true, requestId: true },
    });

    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }

    if (
      invoice.status !== InvoiceStatus.paid &&
      invoice.status !== InvoiceStatus.paid_partial
    ) {
      throw new BadRequestException(
        'لا يمكن استرجاع فاتورة غير مدفوعة أو غير مكتملة الدفع',
      );
    }

    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: { invoiceId: id, isActive: true },
      select: { sparePartId: true, quantity: true },
    });

    return this.prisma.$transaction(
      async (tx) => {
        const refundedInvoice = await tx.invoice.update({
          where: { id },
          data: { status: InvoiceStatus.refunded },
        });

        await tx.request.update({
          where: { id: invoice.requestId },
          data: { isCompleted: false },
        });

        for (const item of invoiceItems) {
          const dto: CreateStockMovementDto = {
            partId: item.sparePartId,
            movementType: MovementType.return,
            quantity: item.quantity,
            reference: 'استرجاع فاتورة',
          };
          await this.movementsService.create(dto, user.id, tx);
        }

        this.logger.log(
          `Invoice ${refundedInvoice.invoiceNumber} refunded by user ${user.id}`,
        );

        return refundedInvoice;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async findAll(query: InvoiceQueryDto) {
    try {
      return await this.invoicesRepository.findMany(query);
    } catch (error) {
      throw new InternalServerErrorException('حدث خطأ أثناء جلب الفواتير');
    }
  }

  async findOne(id: string, userId: string, isTechnician: boolean) {
    const invoice = await this.invoicesRepository.findByIdWithAuthorization(
      id,
      userId,
      isTechnician,
    );
    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }
    return invoice;
  }

  async getInvoicePdfData(id: string, userId: string, isTechnician: boolean) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                firstPhone: true,
                secondPhone: true,
                address: true,
              },
            },
          },
        },
        items: {
          include: {
            sparePart: {
              select: {
                name: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
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
        throw new ForbiddenException('لست مسنداً إلى هذا الطلب');
      }
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      requestId: invoice.requestId,
      requestNumber: invoice.request.requestNumber,
      createdAt: invoice.createdAt,
      customer: {
        id: invoice.request.customer.id,
        name: invoice.request.customer.name,
        firstPhone: invoice.request.customer.firstPhone,
        secondPhone: invoice.request.customer.secondPhone ?? undefined,
        address: invoice.request.customer.address ?? undefined,
      },
      items: invoice.items.map((item) => ({
        id: item.id,
        sparePartId: item.sparePartId,
        sparePartName: item.sparePart?.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        currency: item.currency,
        totalPrice: Number(item.totalPrice),
      })),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        dollarExchangeRate: Number(payment.dollarExchangeRate),
        convertedAmount: Number(payment.convertedAmount),
        paidAt: payment.paidAt,
      })),
      totalAmount: Number(invoice.totalAmount),
      totalCurrency: invoice.totalCurrency,
      remainingAmount: Number(invoice.remainingAmount),
      warrantyPeriod: invoice.warrantyPeriod ?? undefined,
      needsCenterMaintenance: invoice.needsCenterMaintenance ?? undefined,
      notes: invoice.notes ?? undefined,
    };
  }

  private async generateUniqueInvoiceNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const candidate = this.invoiceNumberUtil.generate();
      const existing = await this.prisma.invoice.findUnique({
        where: { invoiceNumber: candidate },
      });
      if (!existing) return candidate;
    }
    throw new BadRequestException('فشل إنشاء رقم فاتورة فريد');
  }
}
