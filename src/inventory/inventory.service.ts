import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletMovementType, ExpenseType, Prisma } from '@prisma/client';
import { CreateInventoryDto, UpdateInventoryDto, CreateWalletMovementDto } from './dto/create-inventory.dto';
import { QuerySoldItemsDto } from './dto/query-sold-items.dto';
import { QueryWalletMovementsDto } from './dto/query-wallet-movements.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  async createInventory(dto: CreateInventoryDto, userId: string) {
    const { technicianId, notes, items } = dto;

    const technician = await this.prisma.user.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new NotFoundException('الفني غير موجود');
    }

    const existing = await this.prisma.technicianInventory.findFirst({
      where: { technicianId },
    });

    if (existing) {
      throw new ConflictException('يوجد مخزون لهذا الفني حالياً');
    }

    const inventory = await this.prisma.$transaction(async (tx) => {
      const created = await tx.technicianInventory.create({
        data: {
          technicianId,
          notes,
          walletAmount: 0.00,
        },
        include: {
          technician: {
            select: {
              fullName: true,
            },
          },
          items: {
            include: {
              sparePart: {
                select: {
                  id: true,
                  name: true,
                  sparePartNumber: true,
                },
              },
            },
          },
        },
      });

      if (items && items.length > 0) {
        await tx.technicianInventoryItem.createMany({
          data: items.map((item) => ({
            technicianInventoryId: created.id,
            sparePartId: item.sparePartId,
            quantity: item.quantity,
          })),
        });
      }

      return created;
    });

    this.logger.log(`Inventory created for technician ${technicianId} by user ${userId}`);
    return inventory;
  }

  async updateInventory(id: string, dto: UpdateInventoryDto) {
    const { notes, items } = dto;

    const existing = await this.prisma.technicianInventory.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('مخزون الفني غير موجود');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const inventory = await tx.technicianInventory.update({
        where: { id },
        data: {
          notes,
        },
        include: {
          technician: {
            select: {
              fullName: true,
            },
          },
        },
      });

      if (items) {
        await tx.technicianInventoryItem.deleteMany({
          where: { technicianInventoryId: id },
        });

        if (items.length > 0) {
          await tx.technicianInventoryItem.createMany({
            data: items.map((item) => ({
              technicianInventoryId: id,
              sparePartId: item.sparePartId,
              quantity: item.quantity,
            })),
          });
        }
      }

      return inventory;
    });

    this.logger.log(`Inventory ${id} updated`);
    return updated;
  }

  async deleteInventory(id: string) {
    const inventory = await this.prisma.technicianInventory.findUnique({
      where: { id },
    });

    if (!inventory) {
      throw new NotFoundException('مخزون الفني غير موجود');
    }

    await this.prisma.technicianInventory.delete({
      where: { id },
    });

    this.logger.log(`Inventory ${id} deleted`);
    return { message: 'تم حذف مخزون الفني بنجاح' };
  }

  async createWalletMovement(dto: CreateWalletMovementDto, userId: string) {
    const { technicianInventoryId, amount, type, notes } = dto;

    const inventory = await this.prisma.technicianInventory.findUnique({
      where: { id: technicianInventoryId },
    });

    if (!inventory) {
      throw new NotFoundException('مخزون الفني غير موجود');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: user.roleId },
      select: { name: true },
    });

    const isTechnician = role?.name === 'Technician';
    if (isTechnician && inventory.technicianId !== userId) {
      throw new ForbiddenException('لا يمكنك إنشاء حركة لمخزون فني آخر');
    }

    const movementType = type as WalletMovementType;
    const amountDecimal = new Prisma.Decimal(amount);

    const movement = await this.prisma.$transaction(async (tx) => {
      let walletDelta = new Prisma.Decimal(0);
      let expense: any = null;

      switch (movementType) {
        case WalletMovementType.addition:
          walletDelta = amountDecimal;
          break;
        case WalletMovementType.deduction:
          walletDelta = amountDecimal.negated();
          if (inventory.walletAmount.lessThan(amountDecimal)) {
            throw new BadRequestException('رصيد المحفظة لا يكفي لهذه العملية');
          }
          break;
        default:
          throw new BadRequestException('نوع حركة غير صالح');
      }

      const newWalletAmount = inventory.walletAmount.add(walletDelta);

      const created = await tx.walletMovement.create({
        data: {
          technicianInventoryId,
          amount,
          responsibleId: userId,
          type: movementType,
          notes,
        },
        include: {
          responsible: {
            select: {
              fullName: true,
            },
          },
        },
      });

      await tx.technicianInventory.update({
        where: { id: technicianInventoryId },
        data: {
          walletAmount: newWalletAmount,
        },
      });

      if (movementType === WalletMovementType.addition) {
        const technician = await tx.user.findUnique({
          where: { id: inventory.technicianId },
          select: { fullName: true },
        });

        const now = new Date();
        expense = await tx.expense.create({
          data: {
            type: ExpenseType.variable,
            name: `إضافة لمحفظة الفني ${technician?.fullName ?? ''}`,
            amount: amountDecimal,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          },
        });
      }

      return { ...created, newWalletAmount, expense };
    });

    this.logger.log(`Wallet movement created for inventory ${technicianInventoryId} by user ${userId}`);
    return movement;
  }

  async getTechnicianInventory(id: string) {
    const inventory = await this.prisma.technicianInventory.findUnique({
      where: { id },
      include: {
        technician: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: {
          include: {
            sparePart: {
              select: {
                id: true,
                name: true,
                sparePartNumber: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('مخزون الفني غير موجود');
    }

    return inventory;
  }

  async getAllTechnicianInventories() {
    const inventories = await this.prisma.technicianInventory.findMany({
      where: {
        technician: {
          isActive: true,
        },
      },
      include: {
        technician: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: {
          include: {
            sparePart: {
              select: {
                id: true,
                name: true,
                sparePartNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const assignments = await this.prisma.technicianAssignment.findMany({
      where: {
        isActive: true,
      },
      include: {
        request: {
          include: {
            invoice: {
              include: {
                items: {
                  include: {
                    sparePart: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const technicianInvoicesMap: Record<string, any[]> = {};

    for (const assignment of assignments) {
      const technicianId = assignment.technicianId;
      const invoice = assignment.request.invoice;

      if (!invoice) continue;

      for (const item of invoice.items) {
        if (!technicianInvoicesMap[technicianId]) {
          technicianInvoicesMap[technicianId] = [];
        }

        technicianInvoicesMap[technicianId].push({
          partName: item.sparePart.name,
          quantity: item.quantity,
          reference: invoice.invoiceNumber,
        });
      }
    }

    const data = inventories.map((inventory) => {
      const invoiceItems = technicianInvoicesMap[inventory.technicianId] || [];

      const aggregatedItems = invoiceItems.reduce(
        (acc, item) => {
          const key = item.partName;
          if (!acc[key]) {
            acc[key] = {
              partName: item.partName,
              totalQuantity: 0,
              references: [],
            };
          }

          acc[key].totalQuantity += item.quantity;

          if (!acc[key].references.includes(item.reference)) {
            acc[key].references.push(item.reference);
          }

          return acc;
        },
        {} as Record<string, any>,
      );

      return {
        ...inventory,
        returns: {
          items: Object.values(aggregatedItems),
        },
      };
    });

    return {
      total: data.length,
      data,
    };
  }

  async getTechnicianSoldItems(technicianId: string, query: QuerySoldItemsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const technician = await this.prisma.user.findUnique({
      where: { id: technicianId },
      select: { id: true, fullName: true },
    });

    if (!technician) {
      throw new NotFoundException('الفني غير موجود');
    }

    const assignments = await this.prisma.technicianAssignment.findMany({
      where: {
        technicianId,
        isActive: true,
      },
      select: {
        requestId: true,
      },
    });

    const requestIds = assignments.map((a) => a.requestId);

    const [invoiceItems, total] = await Promise.all([
      this.prisma.invoiceItem.findMany({
        where: {
          invoice: {
            requestId: { in: requestIds },
          },
          isActive: true,
        },
        include: {
          sparePart: {
            select: {
              id: true,
              name: true,
            },
          },
          invoice: {
            select: {
              invoiceNumber: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          id: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.invoiceItem.count({
        where: {
          invoice: {
            requestId: { in: requestIds },
          },
          isActive: true,
        },
      }),
    ]);

    const data = invoiceItems.map((item) => ({
      id: item.id,
      partName: item.sparePart.name,
      quantity: item.quantity,
      reference: item.invoice.invoiceNumber,
      soldAt: item.invoice.createdAt,
    }));

    return {
      page,
      limit,
      total,
      data,
    };
  }

  async getTechnicianWalletMovements(
    technicianInventoryId: string,
    query: QueryWalletMovementsDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const inventory = await this.prisma.technicianInventory.findUnique({
      where: { id: technicianInventoryId },
      select: { id: true, technicianId: true },
    });

    if (!inventory) {
      throw new NotFoundException('مخزون الفني غير موجود');
    }

    const [movements, total] = await Promise.all([
      this.prisma.walletMovement.findMany({
        where: {
          technicianInventoryId,
        },
        include: {
          responsible: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.walletMovement.count({
        where: {
          technicianInventoryId,
        },
      }),
    ]);

    const data = movements.map((movement) => ({
      id: movement.id,
      amount: Number(movement.amount),
      type: movement.type,
      notes: movement.notes,
      createdAt: movement.createdAt,
      responsible: movement.responsible,
    }));

    return {
      page,
      limit,
      total,
      data,
    };
  }
}
