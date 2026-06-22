import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { SparePartsController } from './spare-parts.controller';
import { SparePartsService } from './spare-parts.service';
import { SparePartsRepository } from './spare-parts.repository';
import { SparePartNumberUtil } from './utils/spare-part-number.util';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';
import { MovementNoUtil } from './utils/movement-no.util';

@Module({
  controllers: [InventoryController, SparePartsController, MovementsController],
  providers: [
    InventoryService,
    SparePartsService,
    SparePartsRepository,
    SparePartNumberUtil,
    MovementsService,
    MovementNoUtil,
  ],
  exports: [MovementsService],
})
export class InventoryModule {}
