import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SparePart, Prisma } from '@prisma/client';

@Injectable()
export class SparePartsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SparePartCreateInput): Promise<SparePart> {
    return this.prisma.sparePart.create({ data });
  }

  async findMany(params: {
    where?: Prisma.SparePartWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.SparePartOrderByWithRelationInput;
  }): Promise<SparePart[]> {
    return this.prisma.sparePart.findMany({
      ...params,
      where: { ...params.where, isActive: true },
    });
  }

  async count(where?: Prisma.SparePartWhereInput): Promise<number> {
    return this.prisma.sparePart.count({
      where: { ...where, isActive: true },
    });
  }

  async findById(id: string): Promise<SparePart | null> {
    return this.prisma.sparePart.findUnique({ where: { id } });
  }

  async findBySku(sku: string): Promise<SparePart | null> {
    return this.prisma.sparePart.findFirst({ where: { sku } });
  }

  async update(
    id: string,
    data: Prisma.SparePartUpdateInput,
  ): Promise<SparePart> {
    return this.prisma.sparePart.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<SparePart> {
    return this.prisma.sparePart.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
