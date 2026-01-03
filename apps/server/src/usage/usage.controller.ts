import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsageService, UsageSummary } from './usage.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators';
import type { User } from '../../generated/prisma/client';

@Controller({ path: 'usage', version: '1' })
@UseGuards(AuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  /**
   * 获取当前月用量
   */
  @Get('current')
  async getCurrentUsage(@CurrentUser() user: User): Promise<UsageSummary> {
    return this.usageService.getMonthlyUsage(user.id);
  }

  /**
   * 获取用量历史
   */
  @Get('history')
  async getUsageHistory(
    @CurrentUser() user: User,
  ): Promise<Array<{ billingPeriod: string } & UsageSummary>> {
    return this.usageService.getUsageHistory(user.id);
  }
}
