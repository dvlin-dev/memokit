/**
 * Console Stats Controller
 * Dashboard statistics API for Console
 */

import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { UsageService } from './usage.service';

@Controller('api/console/stats')
export class ConsoleStatsController {
  constructor(private readonly usageService: UsageService) {}

  /**
   * Get user statistics overview
   * GET /api/console/stats/overview
   */
  @Get('overview')
  async getOverview(@CurrentUser() user: CurrentUserDto) {
    const stats = await this.usageService.getUserStats(user.id);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get daily usage for charts
   * GET /api/console/stats/daily?days=30
   */
  @Get('daily')
  async getDailyUsage(
    @CurrentUser() user: CurrentUserDto,
    @Query('days') days?: string,
  ) {
    const numDays = days ? parseInt(days, 10) : 30;
    const dailyUsage = await this.usageService.getDailyUsage(
      user.id,
      Math.min(numDays, 90), // Max 90 days
    );
    return {
      success: true,
      data: dailyUsage,
    };
  }

  /**
   * Get usage history (monthly)
   * GET /api/console/stats/history?limit=12
   */
  @Get('history')
  async getHistory(
    @CurrentUser() user: CurrentUserDto,
    @Query('limit') limit?: string,
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 12;
    const history = await this.usageService.getUsageHistory(
      user.id,
      Math.min(numLimit, 24), // Max 24 months
    );
    return {
      success: true,
      data: history,
    };
  }
}
