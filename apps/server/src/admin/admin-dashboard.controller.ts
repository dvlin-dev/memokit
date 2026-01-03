/**
 * Admin Dashboard Controller
 * 管理后台仪表盘 API
 */

import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller({ path: 'admin/dashboard', version: VERSION_NEUTRAL })
@RequireAdmin()
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 获取仪表盘统计数据
   * GET /api/admin/dashboard
   */
  @Get()
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  /**
   * 获取图表数据（近 7 天）
   * GET /api/admin/dashboard/charts
   */
  @Get('charts')
  async getChartData() {
    return this.adminService.getChartData();
  }
}
