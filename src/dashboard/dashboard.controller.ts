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

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('stats')
  @Roles('Admin', 'Manager')
  async getStats(): Promise<DashboardStatsResponseDto> {
    return this.dashboardService.getDashboardStats();
  }

  @Get('technician-performance')
  @Roles('Admin')
  async getTechnicianPerformance(): Promise<TechnicianPerformanceResponseDto> {
    return this.dashboardService.getTechnicianPerformance();
  }

  @Get('financial-report')
  @Roles('Admin')
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
