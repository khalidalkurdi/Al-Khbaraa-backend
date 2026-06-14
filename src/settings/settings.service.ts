import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSettingsDto } from './dto/create-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SettingsService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'logo');

  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.getCenterSettings();
    if (!settings) {
      throw new NotFoundException('إعدادات المركز غير موجودة');
    }
    return settings;
  }

  async createSettings(data: CreateSettingsDto) {
    try {
      return this.prisma.centerSettings.create({ data });
    } catch {
      throw new InternalServerErrorException('فشل إنشاء الإعدادات');
    }
  }

  async updateSettings(payload: UpdateSettingsDto) {
    const existing = await this.prisma.getCenterSettings();

    try {
      return this.prisma.upsertCenterSettings({
        where: { id: existing?.id ?? undefined },
        create: payload as any,
        update: payload,
      });
    } catch {
      throw new InternalServerErrorException('فشل تحديث الإعدادات');
    }
  }

  async uploadLogo(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('لم يتم تحميل ملف');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'نوع الملف غير صالح. يسمح فقط بصيغ PNG و JPG.',
      );
    }

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const filename = `logo-${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const logoPath = `/uploads/logo/${filename}`;

    const settings = await this.prisma.getCenterSettings();
    if (!settings) {
      throw new NotFoundException('إعدادات المركز غير موجودة');
    }

    try {
      return this.prisma.updateCenterSettings(
        { id: settings.id },
        { logoPath },
      );
    } catch {
      throw new InternalServerErrorException('فشل حفظ الشعار');
    }
  }
}
