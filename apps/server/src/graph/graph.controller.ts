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
    return this.graphService.getFullGraph(apiKeyId, userId, { limit });
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
    return this.graphService.traverse(
      apiKeyId,
      body.entityId,
      body.options ?? {},
    );
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
    return this.graphService.findPath(
      apiKeyId,
      sourceId,
      targetId,
      maxDepth ?? 5,
    );
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
    return this.graphService.getNeighbors(apiKeyId, entityId, {
      direction,
      relationTypes: relationTypes ? relationTypes.split(',') : undefined,
    });
  }
}
