/**
 * Admin Orders Controller
 *
 * [INPUT]: Order query requests
 * [OUTPUT]: Order data
 * [POS]: Admin API for order management
 */

import {
  Controller,
  Get,
  Query,
  Param,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';
import { OrderQueryDto } from './dto';

@ApiTags('Admin')
@ApiCookieAuth()
@Controller({ path: 'admin/orders', version: VERSION_NEUTRAL })
@RequireAdmin()
export class AdminOrdersController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get orders list
   */
  @Get()
  @ApiOperation({ summary: 'Get orders list' })
  async getOrders(@Query() query: OrderQueryDto) {
    return this.adminService.getOrders(query);
  }

  /**
   * Get single order
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }
}
