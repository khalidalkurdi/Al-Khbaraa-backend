import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory/daily')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Create daily inventory log for a technician' })
  @ApiResponse({
    status: 201,
    description: 'Inventory log created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request or duplicate entry' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  createInventory(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.createInventory(dto);
  }

  @Get()
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'Get all daily inventory logs' })
  @ApiResponse({ status: 200, description: 'List of all inventory logs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  getAllInventory() {
    return this.inventoryService.getAllInventory();
  }

  @Delete(':id')
  @Roles('Admin', 'Manager', 'Employee')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete an inventory log entry' })
  @ApiResponse({
    status: 200,
    description: 'Inventory log deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 404, description: 'Inventory log not found' })
  deleteInventory(@Param('id') id: string) {
    return this.inventoryService.deleteInventory(id);
  }
}
