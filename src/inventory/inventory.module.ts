import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { SparePartsController } from './spare-parts.controller';
import { SparePartsService } from './spare-parts.service';
import { SparePartsRepository } from './spare-parts.repository';
import { SparePartNumberUtil } from './utils/spare-part-number.util';

@Module({
  controllers: [InventoryController, SparePartsController],
  providers: [
    InventoryService,
    SparePartsService,
    SparePartsRepository,
    SparePartNumberUtil,
  ],
})
export class InventoryModule {}
