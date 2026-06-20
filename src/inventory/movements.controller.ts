import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MovementsService } from './movements.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory/movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiOperation({ summary: 'Create a stock movement and update part quantity' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الحركة بنجاح' })
  @ApiResponse({ status: 400, description: 'خطأ في التحقق من صحة البيانات' })
  @ApiResponse({ status: 404, description: 'القطعة غير موجودة' })
  @ApiResponse({ status: 409, description: 'الكمية النهائية سالبة' })
  async create(@Req() req: any, @Body() dto: CreateStockMovementDto) {
    return this.movementsService.create(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'List all stock movements' })
  @ApiResponse({ status: 200, description: 'قائمة حركات المخزون' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async findAll(@Query() query: QueryMovementsDto) {
    return this.movementsService.findAll(query);
  }
}
