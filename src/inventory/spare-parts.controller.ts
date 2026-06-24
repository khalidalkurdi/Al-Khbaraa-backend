import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SparePartsService } from './spare-parts.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { QuerySparePartsDto } from './dto/query-spare-parts.dto';
import { Roles } from '../auth/decorators/roles.decorator';
interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}
@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory/parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Create a spare part' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم إنشاء القطعة' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'خطأ في التحقق من صحة البيانات',
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'رمز التخزين مكرر' })
  create(@Body() dto: CreateSparePartDto) {
    return this.sparePartsService.create(dto);
  }

  @Get()
  @Roles('Admin', 'Manager', 'Employee', 'Technician')
  @ApiOperation({ summary: 'Search and list spare parts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'قائمة القطع مع الترقيم' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: QuerySparePartsDto,
  ) {
    return this.sparePartsService.findAll(query, req);
  }

  @Get(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Get a spare part by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تفاصيل القطعة' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'القطعة غير موجودة',
  })
  findOne(@Param('id') id: string) {
    return this.sparePartsService.findById(id);
  }

  @Patch(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update a spare part' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم تحديث القطعة' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'خطأ في التحقق من صحة البيانات',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'القطعة غير موجودة',
  })
  update(@Param('id') id: string, @Body() dto: UpdateSparePartDto) {
    return this.sparePartsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a spare part' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم حذف القطعة' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'القطعة غير موجودة',
  })
  remove(@Param('id') id: string) {
    return this.sparePartsService.delete(id);
  }
}
