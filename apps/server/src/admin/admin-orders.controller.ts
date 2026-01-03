/**
 * Admin Orders Controller
 * 订单管理 API
 */

import {
  Controller,
  Get,
  Query,
  Param,
  BadRequestException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';
import { orderQuerySchema } from './dto';

@ApiTags('Admin')
@Controller({ path: 'admin/orders', version: VERSION_NEUTRAL })
@RequireAdmin()
export class AdminOrdersController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 获取订单列表
   * GET /api/admin/orders
   */
  @Get()
  async getOrders(@Query() query: unknown) {
    const parsed = orderQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.adminService.getOrders(parsed.data);
  }

  /**
   * 获取单个订单
   * GET /api/admin/orders/:id
   */
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }
}
