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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';
import { orderQuerySchema } from './dto';

@ApiTags('Admin')
@Controller('api/admin/orders')
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
    const result = await this.adminService.getOrders(parsed.data);
    return { success: true, data: result };
  }

  /**
   * 获取单个订单
   * GET /api/admin/orders/:id
   */
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.adminService.getOrder(id);
    return { success: true, data: order };
  }
}
