import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class ImageNumberUtil {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'users');

  async getNextImageFilename(originalname: string): Promise<string> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch {
      throw new Error('فشل إنشاء مجلد الصور');
    }

    const files = await fs.readdir(this.uploadDir);
    let maxNum = 0;
    for (const file of files) {
      const match = file.match(/^Img-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const nextNum = maxNum + 1;
    return `Img-${String(nextNum).padStart(5, '0')}${path.extname(originalname)}`;
  }

  async replaceImageExtension(
    existingPath: string | null | undefined,
    originalname: string,
  ): Promise<string> {
    if (!existingPath) {
      return this.getNextImageFilename(originalname);
    }

    const match = path.basename(existingPath).match(/^(Img-\d+)/);
    const prefix = match ? match[1] : null;

    if (!prefix) {
      return this.getNextImageFilename(originalname);
    }

    return `${prefix}${path.extname(originalname).toLowerCase()}`;
  }
}
