import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { PdfService } from './pdf.service';

@Module({
  imports: [SettingsModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
