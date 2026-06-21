import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Settings')
@Controller('/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get public settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        centerName: {
          type: 'string',
          description: 'اسم المركز الرئيسي',
        },
        secondaryName: {
          type: 'string',
          description: 'الاسم الثانوي',
        },
        address: {
          type: 'string',
          description: 'عنوان المركز',
        },
        phone1: {
          type: 'string',
          description: 'رقم الهاتف الأول',
        },
        phone2: {
          type: 'string',
          description: 'رقم الهاتف الثاني',
        },
        email: {
          type: 'string',
          description: 'البريد الإلكتروني',
        },
        term1: {
          type: 'string',
          description: 'البند الأول',
        },
        term2: {
          type: 'string',
          description: 'البند الثاني',
        },
        term3: {
          type: 'string',
          description: 'البند الثالث',
        },
        term4: {
          type: 'string',
          description: 'البند الرابع',
        },
        dollarExchangeRate: {
          type: 'number',
          description: 'معدل صرف الدولار',
        },
        logo: {
          type: 'string',
          format: 'binary',
          description: 'شعار المركز (5MB max)',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Update settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('logo'))
  async updateSettings(
    @Body() updateSettingsDto: UpdateSettingsDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
        fileIsRequired: false,
      }),
    )
    logo?: Express.Multer.File,
  ) {
    return this.settingsService.updateSettings(updateSettingsDto, logo);
  }
}
