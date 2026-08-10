import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  CreateWalletMovementDto,
} from './dto/create-inventory.dto';
import { QuerySoldItemsDto } from './dto/query-sold-items.dto';
import { QueryWalletMovementsDto } from './dto/query-wallet-movements.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory/technician')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Create technician inventory with items' })
  @ApiResponse({ status: 201, description: 'تم إنشاء مخزون الفني بنجاح' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  @ApiResponse({ status: 404, description: 'الفني غير موجود' })
  @ApiResponse({ status: 409, description: 'يوجد مخزون لهذا الفني حالياً' })
  createInventory(@Req() req: any, @Body() dto: CreateInventoryDto) {
    return this.inventoryService.createInventory(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Get all technician inventories' })
  @ApiResponse({ status: 200, description: 'قائمة مخزونات الفنيين' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  getAllInventories() {
    return this.inventoryService.getAllTechnicianInventories();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Get technician inventory by ID' })
  @ApiResponse({ status: 200, description: 'تفاصيل مخزون الفني' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  @ApiResponse({ status: 404, description: 'مخزون الفني غير موجود' })
  getTechnicianInventory(@Param('id') id: string) {
    return this.inventoryService.getTechnicianInventory(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Update technician inventory without wallet' })
  @ApiResponse({ status: 200, description: 'تم تحديث مخزون الفني بنجاح' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  @ApiResponse({ status: 404, description: 'مخزون الفني غير موجود' })
  updateTechnicianInventory(@Param('id') id: string, @Body() dto: UpdateInventoryDto) {
    return this.inventoryService.updateInventory(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete technician inventory' })
  @ApiResponse({ status: 200, description: 'تم حذف مخزون الفني بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  @ApiResponse({ status: 404, description: 'مخزون الفني غير موجود' })
  deleteTechnicianInventory(@Param('id') id: string) {
    return this.inventoryService.deleteInventory(id);
  }

  @Post('wallet/movement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiOperation({ summary: 'Create wallet movement and update wallet amount' })
  @ApiResponse({ status: 201, description: 'تم إنشاء حركة المحفظة بنجاح' })
  @ApiResponse({ status: 400, description: 'طلب غير صالح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  @ApiResponse({ status: 404, description: 'مخزون الفني غير موجود' })
  createWalletMovement(@Req() req: any, @Body() dto: CreateWalletMovementDto) {
    return this.inventoryService.createWalletMovement(dto, req.user.id);
  }

  @Get('technician/:technicianId/sold-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Get sold items for a technician with pagination' })
  @ApiResponse({ status: 200, description: 'قائمة القطع المباعة للفني' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  @ApiResponse({ status: 404, description: 'الفني غير موجود' })
  getTechnicianSoldItems(
    @Param('technicianId') technicianId: string,
    @Query() query: QuerySoldItemsDto,
  ) {
    return this.inventoryService.getTechnicianSoldItems(technicianId, query);
  }

  @Get(':technicianInventoryId/wallet-movements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Get wallet movements for technician inventory with pagination' })
  @ApiResponse({ status: 200, description: 'قائمة حركات المحفظة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع - الصلاحية غير كافية' })
  @ApiResponse({ status: 404, description: 'مخزون الفني غير موجود' })
  getTechnicianWalletMovements(
    @Param('technicianInventoryId') technicianInventoryId: string,
    @Query() query: QueryWalletMovementsDto,
  ) {
    return this.inventoryService.getTechnicianWalletMovements(
      technicianInventoryId,
      query,
    );
  }
}
