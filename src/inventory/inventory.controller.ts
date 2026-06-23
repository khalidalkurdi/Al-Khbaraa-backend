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
    description: 'تم إنشاء سجل الجرد بنجاح',
  })
  @ApiResponse({ status: 400, description: 'طلب غير صالح أو إدخال مكرر' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  createInventory(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.createInventory(dto);
  }

  @Get()
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Get all daily inventory logs' })
  @ApiResponse({ status: 200, description: 'قائمة سجلات الجرد اليومية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  getAllInventory() {
    return this.inventoryService.getTechnicianDailyInventoryWithUsage();
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete an inventory log entry' })
  @ApiResponse({
    status: 200,
    description: 'تم حذف سجل الجرد بنجاح',
  })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  @ApiResponse({ status: 404, description: 'سجل الجرد غير موجود' })
  deleteInventory(@Param('id') id: string) {
    return this.inventoryService.deleteInventory(id);
  }
}
