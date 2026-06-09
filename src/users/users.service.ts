import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async updateTokenDevice(id: string, tokenDevice: string) {
    return this.prisma.user.update({
      where: { id },
      data: { tokenDevice },
    });
  }

  private stripPassword<T extends { passwordHash: string }>(
    user: T,
  ): Omit<T, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUser(data: {
    email: string;
    password: string;
    fullName: string;
    jobTitle?: string;
    phone?: string;
    salary?: number;
    roles: string[];
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const roleRecords = await this.prisma.role.findMany({
      where: { name: { in: data.roles } },
    });

    if (roleRecords.length !== data.roles.length) {
      const foundRoles = roleRecords.map((r) => r.name);
      const notFound = data.roles.filter((r) => !foundRoles.includes(r));
      throw new BadRequestException(`Roles not found: ${notFound.join(', ')}`);
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        jobTitle: data.jobTitle,
        phone: data.phone,
        salary: data.salary ?? 0,
        tokenDevice: '',
        roles: {
          create: roleRecords.map((role) => ({
            role: { connect: { id: role.id } },
          })),
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    this.logger.log(
      `User created: ${user.email} with roles: ${data.roles.join(', ')}`,
    );

    return this.stripPassword(user);
  }

  async findAll(filters?: { role?: string; isActive?: boolean }) {
    const where: Record<string, unknown> = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.role) {
      where.roles = {
        some: {
          role: {
            name: filters.role,
          },
        },
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return users.map((user) => this.stripPassword(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.stripPassword(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.stripPassword(user);
  }

  async update(
    id: string,
    data: {
      fullName?: string;
      jobTitle?: string;
      phone?: string;
      salary?: number;
      isActive?: boolean;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.isActive === false) {
      const adminRole = await this.prisma.role.findUnique({
        where: { name: 'Admin' },
      });

      if (adminRole) {
        const userRoles = user.roles.map((ur) => ur.role.name);
        if (userRoles.includes('Admin')) {
          const adminCount = await this.prisma.user.count({
            where: {
              isActive: true,
              roles: {
                some: {
                  role: {
                    name: 'Admin',
                  },
                },
              },
            },
          });

          if (adminCount <= 1) {
            throw new BadRequestException(
              'Cannot deactivate the last admin user',
            );
          }
        }
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    this.logger.log(
      `User updated: ${updatedUser.id}, isActive: ${data.isActive}`,
    );

    return this.stripPassword(updatedUser);
  }
}
