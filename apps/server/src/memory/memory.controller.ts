/**
 * [POS]: Memory API Controller
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MemoryService } from './memory.service';
import { CreateMemoryDto, SearchMemoryDto } from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';

@Controller({ path: 'memories', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  /**
   * 创建 Memory
   * POST /api/v1/memories
   */
  @Post()
  async create(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: CreateMemoryDto,
  ) {
    const memory = await this.memoryService.create(apiKeyId, dto);
    return { success: true, data: memory };
  }

  /**
   * 语义搜索 Memory
   * POST /api/v1/memories/search
   */
  @Post('search')
  async search(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: SearchMemoryDto,
  ) {
    const memories = await this.memoryService.search(apiKeyId, dto);
    return { success: true, data: memories };
  }

  /**
   * 列出 Memory
   * GET /api/v1/memories?userId=xxx
   */
  @Get()
  async list(
    @ApiKeyId() apiKeyId: string,
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('agentId') agentId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const memories = await this.memoryService.list(apiKeyId, userId, {
      limit,
      offset,
      agentId,
      sessionId,
    });
    return { success: true, data: memories };
  }

  /**
   * 获取单个 Memory
   * GET /api/v1/memories/:id
   */
  @Get(':id')
  async getById(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    const memory = await this.memoryService.getById(apiKeyId, id);
    return { success: true, data: memory };
  }

  /**
   * 删除 Memory
   * DELETE /api/v1/memories/:id
   */
  @Delete(':id')
  async delete(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    await this.memoryService.delete(apiKeyId, id);
    return { success: true };
  }

  /**
   * 删除用户的所有 Memory
   * DELETE /api/v1/memories/user/:userId
   */
  @Delete('user/:userId')
  async deleteByUser(
    @ApiKeyId() apiKeyId: string,
    @Param('userId') userId: string,
  ) {
    await this.memoryService.deleteByUser(apiKeyId, userId);
    return { success: true };
  }
}
