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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { ImageNumberUtil } from './utils/image-number.util';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('users')
@Controller('/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly imageNumberUtil: ImageNumberUtil,
  ) {}

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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'documentImage', maxCount: 1 },
    ]),
  )
  async create(
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File;
      documentImage?: Express.Multer.File;
    },
    @Body() createUserDto: CreateUserDto,
  ) {
    if (files.profileImage) {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowed.includes(files.profileImage.mimetype)) {
        throw new BadRequestException('نوع ملف الصورة الشخصية غير صالح');
      }
      const newFilename = this.imageNumberUtil.getNextImageFilename(
        files.profileImage.originalname,
      );
      const USERS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'users');
      const newPath = path.join(USERS_UPLOAD_DIR, newFilename);
      if (!fs.existsSync(USERS_UPLOAD_DIR)) {
        fs.mkdirSync(USERS_UPLOAD_DIR, { recursive: true });
      }
      fs.renameSync(files.profileImage.path, newPath);
      (files.profileImage as any).filename = newFilename;
    }

    if (files.documentImage) {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowed.includes(files.documentImage.mimetype)) {
        throw new BadRequestException('نوع ملف صورة الوثيقة غير صالح');
      }
      const newFilename = this.imageNumberUtil.getNextImageFilename(
        files.documentImage.originalname,
      );
      const USERS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'users');
      const newPath = path.join(USERS_UPLOAD_DIR, newFilename);
      if (!fs.existsSync(USERS_UPLOAD_DIR)) {
        fs.mkdirSync(USERS_UPLOAD_DIR, { recursive: true });
      }
      fs.renameSync(files.documentImage.path, newPath);
      (files.documentImage as any).filename = newFilename;
    }

    const profileImage = files.profileImage;
    const documentImage = files.documentImage;
    const dataWithPaths = {
      ...createUserDto,
      ...(profileImage
        ? { profileImagePath: `/uploads/users/${profileImage.filename}` }
        : {}),
      ...(documentImage
        ? { documentImagePath: `/uploads/users/${documentImage.filename}` }
        : {}),
    };
    return this.usersService.createUser(dataWithPaths);
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const pageNum = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit ?? '10', 10) || 10, 1), 100);
    const activeFilter =
      isActive !== undefined ? isActive === 'true' : undefined;
    return this.usersService.findAll(
      { role, isActive: activeFilter },
      pageNum,
      limitNum,
    );
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'documentImage', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File;
      documentImage?: Express.Multer.File;
    },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const existingUser = await this.usersService.findOne(id);

    if (files.profileImage) {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowed.includes(files.profileImage.mimetype)) {
        throw new BadRequestException('نوع ملف الصورة الشخصية غير صالح');
      }
      const USERS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'users');
      const targetFilename = existingUser.profileImagePath
        ? path.basename(existingUser.profileImagePath)
        : this.imageNumberUtil.getNextImageFilename(files.profileImage.originalname);
      const targetPath = path.join(USERS_UPLOAD_DIR, targetFilename);
      if (!fs.existsSync(USERS_UPLOAD_DIR)) {
        fs.mkdirSync(USERS_UPLOAD_DIR, { recursive: true });
      }
      fs.renameSync(files.profileImage.path, targetPath);
      (files.profileImage as any).filename = targetFilename;
    }

    if (files.documentImage) {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowed.includes(files.documentImage.mimetype)) {
        throw new BadRequestException('نوع ملف صورة الوثيقة غير صالح');
      }
      const USERS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'users');
      const targetFilename = existingUser.documentImagePath
        ? path.basename(existingUser.documentImagePath)
        : this.imageNumberUtil.getNextImageFilename(files.documentImage.originalname);
      const targetPath = path.join(USERS_UPLOAD_DIR, targetFilename);
      if (!fs.existsSync(USERS_UPLOAD_DIR)) {
        fs.mkdirSync(USERS_UPLOAD_DIR, { recursive: true });
      }
      fs.renameSync(files.documentImage.path, targetPath);
      (files.documentImage as any).filename = targetFilename;
    }

    const profileImage = files.profileImage;
    const documentImage = files.documentImage;
    const data: any = { ...updateUserDto };
    if (profileImage) {
      data.profileImagePath = `/uploads/users/${profileImage.filename}`;
    }
    if (documentImage) {
      data.documentImagePath = `/uploads/users/${documentImage.filename}`;
    }
    return this.usersService.update(id, data);
  }
}
