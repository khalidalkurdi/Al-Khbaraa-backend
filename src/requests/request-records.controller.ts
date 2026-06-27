import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { UploadRequestRecordsDto } from './dto/upload-request-records.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('requests')
@Controller('request')
export class RequestRecordsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post('records')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Technician')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['requestId', 'records'],
      properties: {
        requestId: {
          type: 'string',
          example: 'ddff58d6-b9af-4520-a7b5-bf174cd0eec2',
        },
        records: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload voice records for a repair request' })
  @ApiResponse({
    status: 201,
    description: 'تم تحميل وتسجيل الملفات الصوتية بنجاح',
  })
  @ApiResponse({
    status: 400,
    description: 'طلب غير صالح - ملف أو طلب غير صالح',
  })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  @ApiResponse({
    status: 403,
    description: 'ممنوع - صلاحيات الدور غير كافية',
  })
  @UseInterceptors(
    FilesInterceptor('records', 10, {
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
    }),
  )
  async uploadRecords(
    @Body() uploadRequestRecordsDto: UploadRequestRecordsDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.requestsService.uploadRequestVoiceRecords(
      uploadRequestRecordsDto.requestId,
      files,
    );
  }
}
