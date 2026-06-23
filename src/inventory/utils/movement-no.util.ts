import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { toSyriaDate } from '../../common/utils/syria-date.util';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class MovementNoUtil {
  generateUniqueMovementNo(): string {
    const date = toSyriaDate(new Date());
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const random = crypto.randomInt(0, 10000).toString().padStart(4, '0');
    return `MOV-${yyyy}${mm}${dd}-${random}`;
  }
}
