import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ImageNumberUtil {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'users');

  getNextImageFilename(originalname: string): string {
    const ext = path.extname(originalname);
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    let maxNum = 0;
    const files = fs.readdirSync(this.uploadDir);
    for (const file of files) {
      const match = file.match(/^Img-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const nextNum = maxNum + 1;
    return `Img-${String(nextNum).padStart(5, '0')}${ext}`;
  }
}
