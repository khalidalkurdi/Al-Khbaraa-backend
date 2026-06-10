export class SparePartResponseDto {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  costSyp: number;
  costUsd: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
