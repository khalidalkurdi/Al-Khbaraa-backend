import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { MovementResponseDto } from './dto/movement-response.dto';
import { MovementNoUtil } from './utils/movement-no.util';
import { plainToClass } from 'class-transformer';
import { MovementType, Prisma } from '@prisma/client';

@Injectable()
export class MovementsService {
  private readonly logger = new Logger(MovementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly movementNoUtil: MovementNoUtil,
  ) {}

  async create(
    dto: CreateStockMovementDto,
    responsibleId: string,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const part = await prisma.sparePart.findUnique({
      where: { id: dto.partId },
    });

    if (!part) {
      throw new NotFoundException('القطعة غير موجودة');
    }

    const quantityDelta = this.getQuantityDelta(dto.movementType, dto.quantity);
    const newQuantity = part.quantity + quantityDelta;

    if (newQuantity < 0) {
      throw new BadRequestException('لا يمكن أن تكون الكمية النهائية سالبة');
    }

    const executeMovement = async (
      client: Prisma.TransactionClient | PrismaService,
    ) => {
      const movementNo = await this.movementNoUtil.generateUniqueMovementNo();

      const movement = await client.inventoryMovement.create({
        data: {
          movementNo,
          partId: dto.partId,
          movementType: dto.movementType,
          responsibleId: responsibleId,
          reference: dto.reference,
          quantity: dto.quantity,
        },
        include: {
          part: {
            select: { id: true, name: true },
          },
        },
      });

      await client.sparePart.update({
        where: { id: dto.partId },
        data: { quantity: newQuantity },
      });
      this.logger.log(
        `Movement ${movementNo} created for part ${dto.partId} by user ${responsibleId}`,
      );
    };

    if (prisma === this.prisma) {
      return await this.prisma.$transaction(async (tx) => {
        return await executeMovement(tx);
      });
    } else if (prisma !== this.prisma) {
      return await executeMovement(prisma);
    }
  }

  async findAll(query: QueryMovementsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        orderBy: { movementDate: 'desc' },
        skip,
        take: limit,
        include: {
          part: {
            select: { id: true, name: true, sparePartNumber: true },
          },
          responsible: {
            select: { fullName: true },
          },
        },
      }),
      this.prisma.inventoryMovement.count(),
    ]);

    return {
      data: movements.map((m) =>
        plainToClass(MovementResponseDto, {
          ...m,
          partId: m.partId,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  private getQuantityDelta(
    movementType: MovementType,
    quantity: number,
  ): number {
    switch (movementType) {
      case MovementType.supply:
        return quantity;
      case MovementType.issue:
        return -quantity;
      case MovementType.return:
        return quantity;
      case MovementType.adjust:
        return quantity - 0;
      default:
        throw new BadRequestException('Invalid movement type');
    }
  }
}
