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
    const { technicianId, inventoryDate, toolsGiven, notes } = dto;

    const technician = await this.prisma.user.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new NotFoundException('الفني غير موجود');
    }

    try {
      const inventory = await this.prisma.technicianDailyInventory.create({
        data: {
          technicianId,
          inventoryDate: new Date(inventoryDate),
          toolsGiven,
          notes,
        },
        include: {
          technician: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(
        `Inventory log created for technician ${technicianId} on ${inventoryDate}`,
      );

      return inventory;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'يوجد سجل جرد لهذا الفني في هذا التاريخ بالفعل',
        );
      }
      throw error;
    }
  }

  async getAllInventory() {
    const inventories = await this.prisma.technicianDailyInventory.findMany({
      include: {
        technician: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        inventoryDate: 'desc',
      },
    });

    this.logger.log(`Retrieved ${inventories.length} inventory logs`);

    return inventories;
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
