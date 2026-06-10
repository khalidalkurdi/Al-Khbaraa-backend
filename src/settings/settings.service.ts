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
      throw new NotFoundException('Center settings not found');
    }
    return settings;
  }

  async createSettings(data: CreateSettingsDto) {
    try {
      return this.prisma.centerSettings.create({ data });
    } catch {
      throw new InternalServerErrorException('Failed to create settings');
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
      throw new InternalServerErrorException('Failed to update settings');
    }
  }

  async uploadLogo(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PNG and JPG are allowed.',
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
      throw new NotFoundException('Center settings not found');
    }

    try {
      return this.prisma.updateCenterSettings(
        { id: settings.id },
        { logoPath },
      );
    } catch {
      throw new InternalServerErrorException('Failed to save logo');
    }
  }
}
