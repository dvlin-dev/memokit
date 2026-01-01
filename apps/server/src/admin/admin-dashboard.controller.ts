/**
 * Admin Dashboard Controller
 * 管理后台仪表盘 API
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('api/admin/dashboard')
@RequireAdmin()
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 获取仪表盘统计数据
   * GET /api/admin/dashboard
   */
  @Get()
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return { success: true, data: stats };
  }

  /**
   * 获取图表数据（近 7 天）
   * GET /api/admin/dashboard/charts
   */
  @Get('charts')
  async getChartData() {
    const data = await this.adminService.getChartData();
    return { success: true, data };
  }
}
