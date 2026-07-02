import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';
import { TechnicianPerformanceResponseDto } from './dto/technician-performance-response.dto';
import {
  FinancialReportQueryDto,
  FinancialReportResponseDto,
} from './dto/financial-report-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Response } from 'express';
import { PdfService } from '../pdf/pdf.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('stats')
  @Roles('Admin')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  @ApiResponse({ status: 404, description: 'الحالة غير موجودة' })
  async getStats(): Promise<DashboardStatsResponseDto> {
    return this.dashboardService.getDashboardStats();
  }

  @Get('technician-performance')
  @Roles('Admin')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  @ApiResponse({ status: 404, description: 'الاداء غير موجود' })
  async getTechnicianPerformance(): Promise<TechnicianPerformanceResponseDto> {
    return this.dashboardService.getTechnicianPerformance();
  }

  @Get('financial-report')
  @Roles('Admin')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع' })
  @ApiResponse({ status: 404, description: 'التقرير المالي غير موجود' })
  async getFinancialReport(
    @Query() query: FinancialReportQueryDto,
    @Query('format') format: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<FinancialReportResponseDto | void> {
    const data = await this.dashboardService.getFinancialReport(query);

    if (format === 'pdf') {
      const pdf = await this.pdfService.generateFinancialReportPdf(data, {
        documentType: 'financial_report',
        filename: `financial-report-${query.startDate}-to-${query.endDate}.pdf`,
      });

      response.setHeader('Content-Type', pdf.contentType);
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${pdf.filename}"`,
      );
      response.setHeader('Cache-Control', 'private, no-cache');
      response.setHeader('Content-Length', pdf.buffer.length);
      response.send(pdf.buffer);
      return;
    }

    return data;
  }
}
