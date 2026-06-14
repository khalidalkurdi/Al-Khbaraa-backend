import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

interface JwtPayload {
  email: string;
  sub: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.isActive) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(user: any, tokenDevice: string) {
    const rolesList = [user.role.name];
    const payload = { email: user.email, sub: user.id, roles: rolesList };

    await this.usersService.updateTokenDevice(user.id, tokenDevice);

    const jwtConfig = this.configService.get('jwt');

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessExpiration,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiration,
    });

    const decoded = this.jwtService.decode(refreshToken);
    const expiresAt = new Date(decoded.exp * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: rolesList,
      },
    };
  }

  async refresh(token: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.refreshSecret')!,
      });
    } catch {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي الصلاحية');
    }

    const dbToken = await this.prisma.refreshToken.findFirst({
      where: { token, isBlocked: false },
    });

    if (!dbToken) {
      throw new UnauthorizedException('رمز التحديث غير صالح أو ملغى');
    }

    await this.prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { isBlocked: true },
    });

    const user = await this.usersService.findByEmail(payload.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('حساب المستخدم معطل أو غير موجود');
    }

    const rolesList = [user.role.name];
    const newPayload = { email: user.email, sub: user.id, roles: rolesList };

    const accessSecret = this.configService.get<string>('jwt.accessSecret')!;
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;
    const jwtConfig = this.configService.get('jwt');

    const accessToken = this.jwtService.sign(newPayload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessExpiration,
    });

    const refreshToken = this.jwtService.sign(newPayload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiration,
    });

    const decoded = this.jwtService.decode(refreshToken);
    const expiresAt = new Date(decoded.exp * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async logout(token: string): Promise<void> {
    const dbToken = await this.prisma.refreshToken.findFirst({
      where: { token },
    });

    if (dbToken) {
      await this.prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: { isBlocked: true },
      });
    }
  }
}
