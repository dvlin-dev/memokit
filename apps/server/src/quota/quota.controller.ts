/**
 * [INPUT]: API 请求 (Session 认证)
 * [OUTPUT]: QuotaStatus
 * [POS]: 配额模块 API 路由
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators';
import type { User } from '../../generated/prisma/client';

@Controller({ path: 'quota', version: '1' })
@UseGuards(AuthGuard)
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  /**
   * 获取当前配额状态
   * GET /api/v1/quota
   */
  @Get()
  async getQuotaStatus(@CurrentUser() user: User) {
    return this.quotaService.getQuotaStatus(user.id);
  }
}
