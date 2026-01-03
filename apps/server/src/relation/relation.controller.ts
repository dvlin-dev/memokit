/**
 * [POS]: Relation API Controller
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
import { RelationService } from './relation.service';
import { CreateRelationDto } from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';

@Controller({ path: 'relations', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  /**
   * 创建关系
   * POST /api/v1/relations
   */
  @Post()
  async create(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: CreateRelationDto,
  ) {
    return this.relationService.create(apiKeyId, dto);
  }

  /**
   * 批量创建关系
   * POST /api/v1/relations/batch
   */
  @Post('batch')
  async createMany(
    @ApiKeyId() apiKeyId: string,
    @Body() dtos: CreateRelationDto[],
  ) {
    return this.relationService.createMany(apiKeyId, dtos);
  }

  /**
   * 列出关系
   * GET /api/v1/relations?userId=xxx
   */
  @Get()
  async list(
    @ApiKeyId() apiKeyId: string,
    @Query('userId') userId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.relationService.list(apiKeyId, userId, {
      type,
      limit,
      offset,
    });
  }

  /**
   * 获取实体的关系
   * GET /api/v1/relations/entity/:entityId
   */
  @Get('entity/:entityId')
  async getByEntity(
    @ApiKeyId() apiKeyId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.relationService.getByEntity(apiKeyId, entityId);
  }

  /**
   * 删除关系
   * DELETE /api/v1/relations/:id
   */
  @Delete(':id')
  async delete(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    await this.relationService.delete(apiKeyId, id);
    return null;
  }
}
