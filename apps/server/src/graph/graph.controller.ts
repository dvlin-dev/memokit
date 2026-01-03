/**
 * [POS]: Graph API Controller
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GraphService, TraversalOptions } from './graph.service';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';

@Controller({ path: 'graph', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  /**
   * 获取用户的完整知识图谱
   * GET /api/v1/graph?userId=xxx
   */
  @Get()
  async getFullGraph(
    @ApiKeyId() apiKeyId: string,
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    const graph = await this.graphService.getFullGraph(apiKeyId, userId, { limit });
    return { success: true, data: graph };
  }

  /**
   * 从指定实体遍历图谱
   * POST /api/v1/graph/traverse
   */
  @Post('traverse')
  async traverse(
    @ApiKeyId() apiKeyId: string,
    @Body() body: { entityId: string; options?: TraversalOptions },
  ) {
    const graph = await this.graphService.traverse(
      apiKeyId,
      body.entityId,
      body.options ?? {},
    );
    return { success: true, data: graph };
  }

  /**
   * 查找两个实体之间的路径
   * GET /api/v1/graph/path?sourceId=xxx&targetId=xxx
   */
  @Get('path')
  async findPath(
    @ApiKeyId() apiKeyId: string,
    @Query('sourceId') sourceId: string,
    @Query('targetId') targetId: string,
    @Query('maxDepth') maxDepth?: number,
  ) {
    const path = await this.graphService.findPath(
      apiKeyId,
      sourceId,
      targetId,
      maxDepth ?? 5,
    );
    return { success: true, data: path };
  }

  /**
   * 获取实体的邻居
   * GET /api/v1/graph/neighbors/:entityId
   */
  @Get('neighbors/:entityId')
  async getNeighbors(
    @ApiKeyId() apiKeyId: string,
    @Param('entityId') entityId: string,
    @Query('direction') direction?: 'in' | 'out' | 'both',
    @Query('relationTypes') relationTypes?: string,
  ) {
    const neighbors = await this.graphService.getNeighbors(apiKeyId, entityId, {
      direction,
      relationTypes: relationTypes ? relationTypes.split(',') : undefined,
    });
    return { success: true, data: neighbors };
  }
}
