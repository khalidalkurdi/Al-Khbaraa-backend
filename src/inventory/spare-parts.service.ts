import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SparePartsRepository } from './spare-parts.repository';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QuerySparePartsDto } from './dto/query-spare-parts.dto';
import { SparePartNumberUtil } from './utils/spare-part-number.util';
import { Prisma } from '@prisma/client';

export const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class SparePartsService {
  private readonly logger = new Logger(SparePartsService.name);

  constructor(
    private readonly repository: SparePartsRepository,
    private readonly sparePartNumberUtil: SparePartNumberUtil,
  ) {}

  async findAll(query: QuerySparePartsDto) {
    const page = query.page ?? undefined;
    const limit = query.limit ?? undefined;
    let skip;
    if (page && limit) skip = (page - 1) * limit;
    const where: any = {};
    if (query.sku) where.sku = query.sku;
    if (query.name) where.name = { contains: query.name };

    const items = await this.repository.findMany({
      where,
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return items;
  }

  async findById(id: string) {
    const part = await this.repository.findById(id);
    if (!part) {
      throw new NotFoundException('قطعة الغيار غير موجودة');
    }
    return part;
  }

  async create(dto: CreateSparePartDto) {
    if (dto.sku !== undefined) {
      const existing = await this.repository.findBySku(dto.sku);
      if (existing) {
        throw new ConflictException('يوجد جزء بهذا الرمز بالفعل');
      }
    }

    const sparePartNumber =
      await this.sparePartNumberUtil.generateUniqueSparePartNumber();

    const part = await this.repository.create({
      sparePartNumber,
      name: dto.name,
      sku: dto.sku,
      shelf_location: dto.shelfLocation,
      costSyp: dto.costSyp,
      costUsd: dto.costUsd,
    });

    this.logger.log(`Spare part created: ${part.id}`);
    return part;
  }

  async update(id: string, dto: UpdateSparePartDto) {
    if (dto.sku !== undefined && dto.sku !== '') {
      const existing = await this.repository.findBySku(dto.sku);
      if (existing && existing.id !== id) {
        throw new ConflictException('يوجد جزء بهذا الرمز بالفعل');
      }
    }

    const updateData: Prisma.SparePartUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.shelfLocation !== undefined)
      updateData.shelf_location = dto.shelfLocation;
    if (dto.costSyp !== undefined) updateData.costSyp = dto.costSyp;
    if (dto.costUsd !== undefined) updateData.costUsd = dto.costUsd;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    const updated = await this.repository.update(id, updateData);

    this.logger.log(`Spare part updated: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.findById(id); // throws NotFoundException if missing
    await this.repository.softDelete(id);
    this.logger.log(`Spare part deleted: ${id}`);
    return { message: 'تم حذف قطعة الغيار بنجاح' };
  }
}
