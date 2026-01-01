/**
 * Console Screenshots Controller
 * 用户控制台截图管理 API
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ScreenshotRepository } from './screenshot.repository';
import { ScreenshotService } from './screenshot.service';
import { ApiKeyService } from '../api-key/api-key.service';
import { screenshotRequestSchema, toScreenshotOptions } from './dto';
import type { ScreenshotStatus } from '../../generated/prisma/client';

const VALID_STATUSES: ScreenshotStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

@Controller('api/console')
export class ScreenshotConsoleController {
  constructor(
    private readonly screenshotRepository: ScreenshotRepository,
    private readonly screenshotService: ScreenshotService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  /**
   * Playground 截图
   * POST /api/console/screenshot
   * 使用会话认证，apiKeyId 用于选择使用哪个 API Key
   */
  @Post('screenshot')
  @HttpCode(HttpStatus.OK)
  async createScreenshot(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: unknown,
  ) {
    // 验证 apiKeyId
    const bodyObj = body as Record<string, unknown>;
    const apiKeyId = bodyObj?.apiKeyId;
    if (!apiKeyId || typeof apiKeyId !== 'string') {
      throw new BadRequestException('apiKeyId is required');
    }

    // 解析并验证截图请求参数
    const parsed = screenshotRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    // 验证 API Key 属于当前用户
    const apiKey = await this.apiKeyService.findOne(user.id, apiKeyId);
    if (!apiKey.isActive) {
      throw new ForbiddenException('API Key is inactive');
    }

    return this.screenshotService.createScreenshot({
      userId: user.id,
      apiKeyId,
      tier: user.tier,
      options: toScreenshotOptions(parsed.data),
    });
  }

  /**
   * 获取用户截图列表
   * GET /api/console/screenshots
   */
  @Get('screenshots')
  async getScreenshots(
    @CurrentUser() user: CurrentUserDto,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('status') status?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    const offset = (page - 1) * limit;

    // 验证 status
    let validStatus: ScreenshotStatus | undefined;
    if (status) {
      if (!VALID_STATUSES.includes(status as ScreenshotStatus)) {
        throw new BadRequestException(`Invalid status: ${status}`);
      }
      validStatus = status as ScreenshotStatus;
    }

    const [data, total] = await Promise.all([
      this.screenshotRepository.findByUser(user.id, {
        status: validStatus,
        limit,
        offset,
      }),
      this.screenshotRepository.countByUser(user.id, validStatus),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取单个截图详情
   * GET /api/console/screenshots/:id
   */
  @Get('screenshots/:id')
  async getScreenshot(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    const screenshot = await this.screenshotRepository.findByIdAndUser(id, user.id);

    if (!screenshot) {
      throw new NotFoundException('Screenshot not found');
    }

    return screenshot;
  }
}
