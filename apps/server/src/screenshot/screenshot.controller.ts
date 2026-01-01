/**
 * [INPUT]: HTTP 请求 (POST /api/v1/screenshot, GET /api/v1/screenshot/:id)
 * [OUTPUT]: ScreenshotResponse
 * [POS]: 截图 API 路由，参数验证，API Key 认证
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ScreenshotService } from './screenshot.service';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { UseApiKey } from '../api-key/api-key.decorators';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import type { CurrentUserDto } from '../types';
import { screenshotRequestSchema, toScreenshotOptions } from './dto';

/** 扩展 Request 类型（API Key 认证） */
interface ApiKeyAuthenticatedRequest extends Request {
  apiKey?: ApiKeyValidationResult;
  user?: CurrentUserDto;
}

@Controller('api/v1/screenshot')
@UseGuards(ApiKeyGuard)
@UseApiKey()
export class ScreenshotController {
  constructor(private readonly screenshotService: ScreenshotService) {}

  /**
   * 创建截图
   * POST /api/v1/screenshot
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async createScreenshot(
    @Body() body: unknown,
    @Req() req: ApiKeyAuthenticatedRequest,
  ) {
    // Zod 验证
    const parsed = screenshotRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    const apiKey = req.apiKey!;
    const user = req.user!;

    return this.screenshotService.createScreenshot({
      userId: user.id,
      apiKeyId: apiKey.id,
      tier: user.tier,
      options: toScreenshotOptions(parsed.data),
    });
  }

  /**
   * 查询截图结果
   * GET /api/v1/screenshot/:id
   */
  @Get(':id')
  async getScreenshot(
    @Param('id') id: string,
    @Req() req: ApiKeyAuthenticatedRequest,
  ) {
    const user = req.user!;

    const result = await this.screenshotService.getScreenshot(id, user.id);

    if (!result) {
      throw new NotFoundException('Screenshot not found');
    }

    return result;
  }
}
