/**
 * API Key Controller
 * API Key 管理接口（控制台使用，Session 认证）
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
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ApiKeyService } from './api-key.service';
import {
  createApiKeySchema,
  updateApiKeySchema,
  type CreateApiKeyDto,
  type UpdateApiKeyDto,
} from './dto';

@Controller({ path: 'console/api-keys', version: VERSION_NEUTRAL })
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Create a new API key
   * POST /api/console/api-keys
   */
  @Post()
  async create(@CurrentUser() user: CurrentUserDto, @Body() body: unknown) {
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    const dto: CreateApiKeyDto = parsed.data;
    const result = await this.apiKeyService.create(user.id, dto);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * List all API keys for current user
   * GET /api/console/api-keys
   */
  @Get()
  async findAll(@CurrentUser() user: CurrentUserDto) {
    const keys = await this.apiKeyService.findAllByUser(user.id);

    return {
      success: true,
      data: keys,
    };
  }

  /**
   * Get a single API key
   * GET /api/console/api-keys/:id
   */
  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    const key = await this.apiKeyService.findOne(user.id, id);

    return {
      success: true,
      data: key,
    };
  }

  /**
   * Update an API key
   * PATCH /api/console/api-keys/:id
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = updateApiKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    const dto: UpdateApiKeyDto = parsed.data;
    const updated = await this.apiKeyService.update(user.id, id, dto);

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Delete an API key
   * DELETE /api/console/api-keys/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.apiKeyService.delete(user.id, id);
  }
}
