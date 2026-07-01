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
  ApiConsumes,
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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

@ApiTags('users')
@Controller('/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly imageNumberUtil: ImageNumberUtil,
  ) {}

  private validateImageFile(
    file: Express.Multer.File,
    sizeErrorMessage: string,
    typeErrorMessage: string,
  ) {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(sizeErrorMessage);
    }

    const mimetype = file.mimetype.split(';')[0].toLowerCase();
    const extension = path.extname(file.originalname).toLowerCase();
    const isAllowed =
      ALLOWED_IMAGE_MIME_TYPES.has(mimetype) &&
      ALLOWED_IMAGE_EXTENSIONS.has(extension);

    if (!isAllowed) {
      throw new BadRequestException(typeErrorMessage);
    }
  }

  private moveUploadedFile(file: Express.Multer.File, filename: string) {
    const USERS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'users');
    const targetPath = path.join(USERS_UPLOAD_DIR, filename);

    if (!fs.existsSync(USERS_UPLOAD_DIR)) {
      fs.mkdirSync(USERS_UPLOAD_DIR, { recursive: true });
    }

    if (file.path) {
      fs.renameSync(file.path, targetPath);
    } else if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    } else {
      throw new BadRequestException('تعذر معالجة الملف المرفوع');
    }

    file.filename = filename;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
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
      profileImage?: Express.Multer.File[];
      documentImage?: Express.Multer.File[];
    },
    @Body() createUserDto: CreateUserDto,
  ) {
    const uploadedFiles = files ?? {};
    const profileImage = uploadedFiles.profileImage?.[0];
    const documentImage = uploadedFiles.documentImage?.[0];

    if (profileImage) {
      this.validateImageFile(
        profileImage,
        'حجم الصورة الشخصية يتجاوز 5 ميجابايت',
        'نوع ملف الصورة الشخصية غير صالح',
      );
      const newFilename = this.imageNumberUtil.getNextImageFilename(
        profileImage.originalname,
      );
      this.moveUploadedFile(profileImage, newFilename);
    }

    if (documentImage) {
      this.validateImageFile(
        documentImage,
        'حجم الصورة للوثيقة يتجاوز 5 ميجابايت',
        'نوع ملف صورة الوثيقة غير صالح',
      );
      const newFilename = this.imageNumberUtil.getNextImageFilename(
        documentImage.originalname,
      );
      this.moveUploadedFile(documentImage, newFilename);
    }
    const dataWithPaths: CreateUserDto = { ...createUserDto };

    if (profileImage) {
      dataWithPaths.profileImagePath = `/uploads/users/${profileImage.filename}`;
    }

    if (documentImage) {
      dataWithPaths.documentImagePath = `/uploads/users/${documentImage.filename}`;
    }

    return this.usersService.createUser(dataWithPaths);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
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
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'تم إرجاع قائمة المستخدمين' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - يتطلب صلاحية المشرف أو المدير',
  })
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const pageNum = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const limitNum = Math.min(
      Math.max(parseInt(limit ?? '10', 10) || 10, 1),
      100,
    );
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
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (Admin )' })
  @ApiResponse({ status: 200, description: 'تم إرجاع المستخدم' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
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
      profileImage?: Express.Multer.File[];
      documentImage?: Express.Multer.File[];
    },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const uploadedFiles = files ?? {};
    const profileImage = uploadedFiles.profileImage?.[0];
    const documentImage = uploadedFiles.documentImage?.[0];
    const existingUser = (await this.usersService.findOne(id)) as {
      profileImagePath?: string | null;
      documentImagePath?: string | null;
    };

    if (profileImage) {
      this.validateImageFile(
        profileImage,
        'حجم الصورة الشخصية يتجاوز 5 ميجابايت',
        'نوع ملف الصورة الشخصية غير صالح',
      );
      const targetFilename = existingUser.profileImagePath
        ? path.basename(existingUser.profileImagePath)
        : this.imageNumberUtil.getNextImageFilename(profileImage.originalname);
      if (existingUser.profileImagePath) {
        const oldPath = path.join(process.cwd(), existingUser.profileImagePath);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      this.moveUploadedFile(profileImage, targetFilename);
    }

    if (documentImage) {
      this.validateImageFile(
        documentImage,
        'حجم الصورة للوثيقة يتجاوز 5 ميجابايت',
        'نوع ملف صورة الوثيقة غير صالح',
      );
      const targetFilename = existingUser.documentImagePath
        ? path.basename(existingUser.documentImagePath)
        : this.imageNumberUtil.getNextImageFilename(documentImage.originalname);
      if (existingUser.documentImagePath) {
        const oldPath = path.join(
          process.cwd(),
          existingUser.documentImagePath,
        );
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      this.moveUploadedFile(documentImage, targetFilename);
    }

    const dataWithPaths: UpdateUserDto = { ...updateUserDto };

    if (profileImage) {
      dataWithPaths.profileImagePath = `/uploads/users/${profileImage.filename}`;
    }

    if (documentImage) {
      dataWithPaths.documentImagePath = `/uploads/users/${documentImage.filename}`;
    }

    return this.usersService.update(id, dataWithPaths);
  }
}
