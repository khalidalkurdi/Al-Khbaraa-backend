import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

@ApiTags('users')
@Controller('/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new staff member (Admin only)' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المستخدم بنجاح' })
  @ApiResponse({
    status: 400,
    description: 'طلب غير صالح - خطأ في التحقق من صحة البيانات أو بريد مكرر',
  })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - يتطلب صلاحية المشرف',
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users (Admin/Manager only)' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by role name',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @ApiResponse({ status: 200, description: 'تم إرجاع قائمة المستخدمين' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - يتطلب صلاحية المشرف أو المدير',
  })
  async findAll(
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeFilter =
      isActive !== undefined ? isActive === 'true' : undefined;
    return this.usersService.findAll({ role, isActive: activeFilter });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'تم إرجاع ملف المستخدم' })
  async findMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.getMe(req.user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (Admin/Manager or self)' })
  @ApiResponse({ status: 200, description: 'تم إرجاع المستخدم' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user details (Admin only)' })
  @ApiResponse({ status: 200, description: 'تم تحديث المستخدم بنجاح' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }
}
