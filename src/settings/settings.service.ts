import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { promises as fs } from 'fs';
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

  async updateSettings(payload: UpdateSettingsDto, file?: Express.Multer.File) {
    const existing = await this.prisma.getCenterSettings();

    let logoPath: string | undefined;
    if (file) {
      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        throw new BadRequestException(
          'نوع الملف غير صالح. يسمح فقط بصيغ PNG و JPG.',
        );
      }

      await fs.mkdir(this.uploadDir, { recursive: true });

      const filename = `logo${ext}`;
      const filePath = path.join(this.uploadDir, filename);
      await fs.writeFile(filePath, file.buffer);
      logoPath = `/uploads/logo/${filename}`;
    }

    // Clean payload to remove undefined and empty values
    const cleanPayload: Record<string, unknown> = Object.fromEntries(
      Object.entries(payload).filter(([key, v]) => {
        if (v === undefined || v === '') {
          return false;
        }
        return true;
      }),
    );

    // Include logoPath if a file was uploaded
    if (logoPath !== undefined) {
      cleanPayload.logoPath = logoPath;
    }

    try {
      if (existing) {
        return this.prisma.centerSettings.update({
          where: { id: existing.id },
          data: cleanPayload,
        });
      } else {
        // Validate required fields for initial creation
        const requiredFields = ['centerName', 'address', 'phone1', 'email'];
        const missingFields = requiredFields.filter(
          (field) => !cleanPayload[field] || cleanPayload[field] === '',
        );
        if (missingFields.length > 0) {
          throw new BadRequestException(
            `الحقول التالية مطلوبة: ${missingFields.join(', ')}`,
          );
        }
        return this.prisma.centerSettings.create({
          data: cleanPayload as Prisma.CenterSettingsCreateInput,
        });
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('فشل تحديث الإعدادات');
    }
  }
}
