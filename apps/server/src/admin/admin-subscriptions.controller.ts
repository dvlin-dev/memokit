/**
 * Admin Subscriptions Controller
 * 订阅管理 API
 */

import {
  Controller,
  Get,
  Patch,
  Query,
  Param,
  Body,
  BadRequestException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';
import { subscriptionQuerySchema, updateSubscriptionSchema } from './dto';

@ApiTags('Admin')
@Controller({ path: 'admin/subscriptions', version: VERSION_NEUTRAL })
@RequireAdmin()
export class AdminSubscriptionsController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 获取订阅列表
   * GET /api/admin/subscriptions
   */
  @Get()
  async getSubscriptions(@Query() query: unknown) {
    const parsed = subscriptionQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminService.getSubscriptions(parsed.data);
  }

  /**
   * 获取单个订阅
   * GET /api/admin/subscriptions/:id
   */
  @Get(':id')
  async getSubscription(@Param('id') id: string) {
    return this.adminService.getSubscription(id);
  }

  /**
   * 更新订阅
   * PATCH /api/admin/subscriptions/:id
   */
  @Patch(':id')
  async updateSubscription(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminService.updateSubscription(id, parsed.data);
  }
}
