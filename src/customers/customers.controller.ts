import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new customer (Admin/Manager/Employee only)',
  })
  @ApiResponse({ status: 201, description: 'تم إنشاء العميل بنجاح' })
  @ApiResponse({
    status: 400,
    description:
      'طلب غير صالح - خطأ في التحقق من صحة البيانات أو رقم هاتف مكرر',
  })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - صلاحيات الدور غير كافية',
  })
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List customers with search and pagination' })
  @ApiQuery({
    name: 'phone',
    required: false,
    description: 'Partial phone number match',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Partial name match',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({ status: 200, description: 'تم إرجاع قائمة العملاء' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - صلاحيات الدور غير كافية',
  })
  async findAll(
    @Query('phone') phone?: string,
    @Query('name') name?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.findAll({
      phone,
      name,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer by ID with repair history' })
  @ApiResponse({ status: 200, description: 'تم إرجاع العميل مع سجل الإصلاح' })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager', 'Employee')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update customer details (Admin/Manager/Employee only)',
  })
  @ApiResponse({ status: 200, description: 'تم تحديث العميل بنجاح' })
  @ApiResponse({
    status: 400,
    description:
      'طلب غير صالح - خطأ في التحقق من صحة البيانات أو رقم هاتف مكرر',
  })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete customer (Admin only)' })
  @ApiResponse({ status: 204, description: 'تم تعطيل العميل' })
  @ApiResponse({
    status: 400,
    description: 'لا يمكن الحذف - العميل مرتبط بطلبات',
  })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
  }
}
