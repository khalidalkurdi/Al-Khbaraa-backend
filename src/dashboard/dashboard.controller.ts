import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';
import { TechnicianPerformanceResponseDto } from './dto/technician-performance-response.dto';
import { FinancialReportQueryDto } from './dto/financial-report-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

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
}
