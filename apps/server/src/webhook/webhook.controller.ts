/**
 * Webhook Controller
 * Webhook CRUD API
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { WebhookService } from './webhook.service';
import { createWebhookSchema, updateWebhookSchema } from './dto';

@Controller({ path: 'console/webhooks', version: VERSION_NEUTRAL })
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * 创建 Webhook
   * POST /api/console/webhooks
   */
  @Post()
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: unknown,
  ) {
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    const result = await this.webhookService.create(user.id, parsed.data);
    return { success: true, data: result };
  }

  /**
   * 获取所有 Webhooks
   * GET /api/console/webhooks
   */
  @Get()
  async findAll(@CurrentUser() user: CurrentUserDto) {
    const webhooks = await this.webhookService.findAllByUser(user.id);
    return { success: true, data: webhooks };
  }

  /**
   * 获取单个 Webhook
   * GET /api/console/webhooks/:id
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    const webhook = await this.webhookService.findOne(id, user.id);
    return { success: true, data: webhook };
  }

  /**
   * 更新 Webhook
   * PATCH /api/console/webhooks/:id
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = updateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    const updated = await this.webhookService.update(id, user.id, parsed.data);
    return { success: true, data: updated };
  }

  /**
   * 删除 Webhook
   * DELETE /api/console/webhooks/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.webhookService.remove(id, user.id);
  }

  /**
   * 重新生成 Secret
   * POST /api/console/webhooks/:id/regenerate-secret
   */
  @Post(':id/regenerate-secret')
  async regenerateSecret(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    const webhook = await this.webhookService.regenerateSecret(id, user.id);
    return { success: true, data: webhook };
  }

  /**
   * 获取所有 Webhook 投递日志
   * GET /api/console/webhooks/deliveries
   */
  @Get('deliveries')
  async getAllDeliveries(
    @CurrentUser() user: CurrentUserDto,
    @Query('webhookId') webhookId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.webhookService.getAllDeliveries(user.id, {
      webhookId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      data: result.deliveries,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  /**
   * 获取单个 Webhook 的投递日志
   * GET /api/console/webhooks/:id/deliveries
   */
  @Get(':id/deliveries')
  async getDeliveries(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.webhookService.getDeliveries(id, user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      data: result.deliveries,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }
}
