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
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { WebhookService } from './webhook.service';
import { createWebhookSchema, updateWebhookSchema } from './dto';

@Controller('api/console/webhooks')
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
}
