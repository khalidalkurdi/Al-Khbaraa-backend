import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Public()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @Roles('Admin')
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(updateSettingsDto);
  }

  @Post('logo')
  @Roles('Admin')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    return this.settingsService.uploadLogo(file);
  }
}
