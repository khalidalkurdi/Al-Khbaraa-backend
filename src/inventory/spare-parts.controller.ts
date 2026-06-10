import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
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

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('api/inventory/parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Post()
  @Roles('Admin')
  @ApiOperation({ summary: 'Create a spare part' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Part created' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Duplicate SKU' })
  create(@Body() dto: CreateSparePartDto) {
    return this.sparePartsService.create(dto);
  }

  @Get('low-stock')
  @Roles('Admin', 'Manager')
  @ApiOperation({ summary: 'List low-stock parts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Low-stock parts' })
  getLowStock() {
    return this.sparePartsService.findLowStock();
  }

  @Get()
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Search and list spare parts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated parts list' })
  findAll(@Query() query: QuerySparePartsDto) {
    return this.sparePartsService.findAll(query);
  }

  @Get(':id')
  @Roles('Admin', 'Manager', 'Employee')
  @ApiOperation({ summary: 'Get a spare part by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Part details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Part not found' })
  findOne(@Param('id') id: string) {
    return this.sparePartsService.findById(id);
  }

  @Put(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update a spare part' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Part updated' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Part not found' })
  update(@Param('id') id: string, @Body() dto: UpdateSparePartDto) {
    return this.sparePartsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a spare part' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Part deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Part not found' })
  remove(@Param('id') id: string) {
    return this.sparePartsService.delete(id);
  }
}
