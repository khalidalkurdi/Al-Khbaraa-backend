import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiration: string | number;
  refreshExpiration: string | number;
}

type JwtSignOptions = {
  secret: string;
  expiresIn: string | number | undefined;
};

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

  private getJwtConfig(): JwtConfig {
    return this.configService.get<JwtConfig>('jwt')!;
  }

  private buildSignOptions(config: JwtConfig): JwtSignOptions {
    return {
      secret: config.accessSecret,
      expiresIn: config.accessExpiration,
    };
  }

  private buildRefreshSignOptions(config: JwtConfig): JwtSignOptions {
    return {
      secret: config.refreshSecret,
      expiresIn: config.refreshExpiration,
    };
  }

  async login(
    user: {
      id: string;
      email: string;
      fullName: string;
      role: { name: string };
    },
    tokenDevice: string,
  ) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
      Issuer: 'Al-kubaraa',
    };

    await this.usersService.updateTokenDevice(user.id, tokenDevice);
    await this.usersService.updateLastLogin(user.id);

    const jwtConfig = this.getJwtConfig();

    const accessToken = this.jwtService.sign(
      payload as any,
      this.buildSignOptions(jwtConfig),
    );

    const refreshToken = this.jwtService.sign(
      payload as any,
      this.buildRefreshSignOptions(jwtConfig),
    );

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
        role: user.role.name,
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

    const newPayload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
      Issuer: 'Al-kubaraa',
    };

    const jwtConfig = this.getJwtConfig();

    const accessToken = this.jwtService.sign(
      newPayload as any,
      this.buildSignOptions(jwtConfig),
    );

    const refreshToken = this.jwtService.sign(
      newPayload as any,
      this.buildRefreshSignOptions(jwtConfig),
    );

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
    try {
      const dbToken = await this.prisma.refreshToken.findFirst({
        where: { token, isBlocked: false },
      });

      if (!dbToken) {
        throw new NotFoundException(
          'لم يتم العثور على التوكن أو أنه محظور بالفعل',
        );
      }

      await this.prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: {
          isBlocked: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'فشل تسجيل الخروج، يرجى المحاولة مرة أخرى',
      );
    }
  }
}
