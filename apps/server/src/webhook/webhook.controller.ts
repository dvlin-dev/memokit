/**
 * Webhook Controller
 *
 * [INPUT]: CreateWebhookDto, UpdateWebhookDto
 * [OUTPUT]: Webhook responses
 * [POS]: Console API for Webhook management
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
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { WebhookService } from './webhook.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  ListDeliveriesQueryDto,
} from './dto';

@ApiTags('Webhook')
@ApiCookieAuth()
@Controller({ path: 'console/webhooks', version: VERSION_NEUTRAL })
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Create a webhook
   */
  @Post()
  @ApiOperation({ summary: 'Create a webhook' })
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.create(user.id, dto);
  }

  /**
   * List all webhooks
   */
  @Get()
  @ApiOperation({ summary: 'List all webhooks' })
  async findAll(@CurrentUser() user: CurrentUserDto) {
    return this.webhookService.findAllByUser(user.id);
  }

  /**
   * Get all webhook deliveries
   */
  @Get('deliveries')
  @ApiOperation({ summary: 'Get all webhook deliveries' })
  async getAllDeliveries(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: ListDeliveriesQueryDto,
  ) {
    const result = await this.webhookService.getAllDeliveries(user.id, {
      webhookId: query.webhookId,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      items: result.deliveries,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }

  /**
   * Get a single webhook
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  async findOne(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    return this.webhookService.findOne(id, user.id);
  }

  /**
   * Update a webhook
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.update(id, user.id, dto);
  }

  /**
   * Delete a webhook
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  async remove(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.webhookService.remove(id, user.id);
  }

  /**
   * Regenerate webhook secret
   */
  @Post(':id/regenerate-secret')
  @ApiOperation({ summary: 'Regenerate webhook secret' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  async regenerateSecret(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    return this.webhookService.regenerateSecret(id, user.id);
  }

  /**
   * Get webhook deliveries
   */
  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get deliveries for a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  async getDeliveries(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Query() query: ListDeliveriesQueryDto,
  ) {
    const result = await this.webhookService.getDeliveries(id, user.id, {
      limit: query.limit,
      offset: query.offset,
    });

    return {
      items: result.deliveries,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }
}
