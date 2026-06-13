import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SparePartsRepository } from './spare-parts.repository';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QuerySparePartsDto } from './dto/query-spare-parts.dto';
import { SparePartResponseDto } from './dto/spare-part-response.dto';
import { plainToClass } from 'class-transformer';
import { SparePartNumberUtil } from './utils/spare-part-number.util';

export const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class SparePartsService {
  private readonly logger = new Logger(SparePartsService.name);

  constructor(
    private readonly repository: SparePartsRepository,
    private readonly sparePartNumberUtil: SparePartNumberUtil,
  ) {}

  async findAll(query: QuerySparePartsDto): Promise<SparePartResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = {};
    if (query.sku) where.sku = query.sku;
    if (query.name) where.name = { contains: query.name, mode: 'insensitive' };

    const items = await this.repository.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.toResponse(item));
  }

  async findLowStock(): Promise<SparePartResponseDto[]> {
    const items = await this.repository.findLowStock(LOW_STOCK_THRESHOLD);
    return items.map((item) => this.toResponse(item));
  }

  async findById(id: string): Promise<SparePartResponseDto> {
    const part = await this.repository.findById(id);
    if (!part) {
      throw new NotFoundException('Spare part not found');
    }
    return this.toResponse(part);
  }

  async create(dto: CreateSparePartDto): Promise<SparePartResponseDto> {
    if (dto.sku) {
      const existing = await this.repository.findBySku(dto.sku);
      if (existing) {
        throw new ConflictException('A part with this SKU already exists');
      }
    }

    const sparePartNumber =
      await this.sparePartNumberUtil.generateUniqueSparePartNumber();

    const part = await this.repository.create({
      sparePartNumber,
      name: dto.name,
      sku: dto.sku,
      quantity: dto.quantity,
      costSyp: dto.costSyp,
      costUsd: dto.costUsd,
    });

    this.logger.log(`Spare part created: ${part.id}`);
    return this.toResponse(part);
  }

  async update(
    id: string,
    dto: UpdateSparePartDto,
  ): Promise<SparePartResponseDto> {
    if (dto.sku) {
      const existing = await this.repository.findBySku(dto.sku);
      if (existing && existing.id !== id) {
        throw new ConflictException('A part with this SKU already exists');
      }
    }

    if (dto.quantity < 0) {
      throw new BadRequestException('quantity must be >= 0');
    }

    const updated = await this.repository.update(id, {
      name: dto.name,
      sku: dto.sku,
      quantity: dto.quantity,
      costSyp: dto.costSyp,
      costUsd: dto.costUsd,
      isActive: true,
    });

    this.logger.log(`Spare part updated: ${id}`);
    return this.toResponse(updated);
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.findById(id); // throws NotFoundException if missing
    await this.repository.softDelete(id);
    this.logger.log(`Spare part deleted: ${id}`);
    return { message: 'Spare part deleted successfully' };
  }

  async restock(id: string, delta: number): Promise<SparePartResponseDto> {
    const part = await this.findById(id);
    const newQuantity = part.quantity + delta;
    if (newQuantity < 0) {
      throw new BadRequestException(
        'Restock would result in negative quantity',
      );
    }
    const updated = await this.repository.update(id, { quantity: newQuantity });
    this.logger.log(`Spare part restocked: ${id} by ${delta}`);
    return this.toResponse(updated);
  }

  async deduct(id: string, delta: number): Promise<SparePartResponseDto> {
    const part = await this.findById(id);
    const newQuantity = part.quantity - delta;
    if (newQuantity < 0) {
      throw new BadRequestException(
        'Deduction would result in negative quantity',
      );
    }
    const updated = await this.repository.update(id, { quantity: newQuantity });
    this.logger.log(`Spare part deducted: ${id} by ${delta}`);
    return this.toResponse(updated);
  }

  private toResponse(part: any): SparePartResponseDto {
    return plainToClass(SparePartResponseDto, part);
  }
}
