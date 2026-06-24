import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserNumberUtil } from './utils/user-number.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { getSyriaNow } from '../common/utils/syria-date.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userNumberUtil: UserNumberUtil,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });
  }

  async updateTokenDevice(id: string, tokenDevice: string) {
    return this.prisma.user.update({
      where: { id },
      data: { tokenDevice },
    });
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: getSyriaNow() },
    });
  }

  private stripPassword<T extends { passwordHash: string }>(
    user: T,
  ): Omit<T, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUser(data: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException(
        'يوجد مستخدم بهذا البريد الإلكتروني بالفعل',
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const roleRecord = await this.prisma.role.findUnique({
      where: { name: data.role },
    });

    if (!roleRecord) {
      throw new BadRequestException(`الدور غير موجود: ${data.role}`);
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        userNumber: await this.userNumberUtil.generateUniqueUserNumber(),
        jobTitle: data.jobTitle,
        roleId: roleRecord.id,
        phone: data.phone,
        salary: data.salary,
        tokenDevice: '',
        lastLoginAt: null,
        profileImagePath: data.profileImagePath,
        documentImagePath: data.documentImagePath,
      },
      include: {
        role: true,
      },
    });

    this.logger.log(`User created: ${user.email} with role: ${data.role}`);

    return this.stripPassword(user);
  }

  async findAll(
    filters?: { role?: string; isActive?: boolean },
    page = 1,
    limit = 10,
  ) {
    const where: Record<string, unknown> = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.role) {
      where.role = {
        name: filters.role,
      };
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          role: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.stripPassword(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return this.stripPassword(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return this.stripPassword(user);
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (data.email !== undefined) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: data.email, id: { not: id } },
      });

      if (existingUser) {
        throw new BadRequestException(
          'يوجد مستخدم بهذا البريد الإلكتروني بالفعل',
        );
      }
    }

    if (data.isActive === false) {
      const adminRole = await this.prisma.role.findUnique({
        where: { name: 'Admin' },
      });

      if (adminRole && user.role.name === 'Admin') {
        const adminCount = await this.prisma.user.count({
          where: {
            isActive: true,
            role: {
              name: 'Admin',
            },
          },
        });

        if (adminCount <= 1) {
          throw new BadRequestException('لا يمكن تعطيل آخر مستخدم مشرف');
        }
      }
    }

    const updateData: Prisma.UserUpdateInput = {};

    this.logger.log(
      `Received isActive=${data.isActive}, type=${typeof data.isActive}`,
    );
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.phone !== undefined) updateData.phone = data.phone ?? '';
    if (data.salary !== undefined) updateData.salary = data.salary;
    if (data.profileImagePath !== undefined)
      updateData.profileImagePath = data.profileImagePath;
    if (data.documentImagePath !== undefined)
      updateData.documentImagePath = data.documentImagePath;
    if (data.role !== undefined) {
      const roleRecord = await this.prisma.role.findUnique({
        where: { name: data.role },
      });

      if (!roleRecord) {
        throw new BadRequestException(`الدور غير موجود: ${data.role}`);
      }

      updateData.role = { connect: { id: roleRecord.id } };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
      },
    });

    this.logger.log(
      `User updated: ${updatedUser.id}, isActive: ${updatedUser.isActive}`,
    );

    return this.stripPassword(updatedUser);
  }
}
