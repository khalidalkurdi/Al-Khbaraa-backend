import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  async createInventory(dto: CreateInventoryDto) {
    const { technicianId, toolsGiven, notes } = dto;

    const technician = await this.prisma.user.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new NotFoundException('الفني غير موجود');
    }

    const existing = await this.prisma.technicianDailyInventory.findFirst({
      where: {
        technicianId: dto.technicianId,
      },
    });
    if (existing) {
      throw new ConflictException(
        'يوجد مخزون يومي لهذا الفني لهذا الفني حاليا',
      );
    }
    try {
      const inventory = await this.prisma.technicianDailyInventory.create({
        data: {
          technicianId,
          toolsGiven,
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

      this.logger.log(`Inventory log created for technician ${technicianId}`);

      return inventory;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('يوجد سجل جرد لهذا الفني حاليا');
      }
      throw error;
    }
  }

  async getTechnicianDailyInventoryWithUsage() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const inventories = await this.prisma.technicianDailyInventory.findMany({
      include: {
        technician: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const usedParts = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          request: {
            assignments: {
              some: {
                isActive: true,
              },
            },
          },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      },
      select: {
        quantity: true,
        sparePart: {
          select: {
            id: true,
            name: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            requestId: true,
            request: {
              select: {
                id: true,
                requestNumber: true,
                assignments: {
                  select: {
                    technicianId: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 3. تجميع القطع المستخدمة حسب الفني
    const technicianPartsMap: Record<string, any[]> = {};

    for (const item of usedParts) {
      // الحصول على الفني النشط من التخصيصات
      const activeAssignment = item.invoice.request.assignments.find(
        (a) => a.isActive === true,
      );

      if (!activeAssignment) continue;

      const technicianId = activeAssignment.technicianId;

      if (!technicianPartsMap[technicianId]) {
        technicianPartsMap[technicianId] = [];
      }

      technicianPartsMap[technicianId].push({
        id: item.sparePart.id,
        partName: item.sparePart.name,
        quantity: item.quantity,
      });
    }

    const result = inventories.map((inventory) => {
      const partsUsed = technicianPartsMap[inventory.technicianId] || [];

      // تجميع القطع حسب sparePartId
      const aggregatedParts = partsUsed.reduce(
        (acc, item) => {
          const key = item.id;
          if (!acc[key]) {
            acc[key] = {
              name: item.name,
              totalQuantity: 0,
            };
          }
          acc[key].totalQuantity += item.quantity;

          return acc;
        },
        {} as Record<string, any>,
      );

      return {
        ...inventory,
        dailyUsage: {
          parts: Object.values(aggregatedParts),
        },
      };
    });

    return {
      totalTechnicians: result.length,
      technicians: result,
    };
  }

  async deleteInventory(id: string) {
    const inventory = await this.prisma.technicianDailyInventory.findUnique({
      where: { id },
    });

    if (!inventory) {
      throw new NotFoundException('سجل الجرد غير موجود');
    }

    await this.prisma.technicianDailyInventory.delete({
      where: { id },
    });

    this.logger.log(`Inventory log ${id} deleted`);

    return { message: 'تم حذف سجل الجرد بنجاح' };
  }
}
