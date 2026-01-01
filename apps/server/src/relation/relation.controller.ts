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

@Controller('v1/relations')
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  /**
   * 创建关系
   * POST /v1/relations
   */
  @Post()
  async create(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: CreateRelationDto,
  ) {
    const relation = await this.relationService.create(apiKeyId, dto);
    return { success: true, data: relation };
  }

  /**
   * 批量创建关系
   * POST /v1/relations/batch
   */
  @Post('batch')
  async createMany(
    @ApiKeyId() apiKeyId: string,
    @Body() dtos: CreateRelationDto[],
  ) {
    const relations = await this.relationService.createMany(apiKeyId, dtos);
    return { success: true, data: relations };
  }

  /**
   * 列出关系
   * GET /v1/relations?userId=xxx
   */
  @Get()
  async list(
    @ApiKeyId() apiKeyId: string,
    @Query('userId') userId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const relations = await this.relationService.list(apiKeyId, userId, {
      type,
      limit,
      offset,
    });
    return { success: true, data: relations };
  }

  /**
   * 获取实体的关系
   * GET /v1/relations/entity/:entityId
   */
  @Get('entity/:entityId')
  async getByEntity(
    @ApiKeyId() apiKeyId: string,
    @Param('entityId') entityId: string,
  ) {
    const relations = await this.relationService.getByEntity(apiKeyId, entityId);
    return { success: true, data: relations };
  }

  /**
   * 删除关系
   * DELETE /v1/relations/:id
   */
  @Delete(':id')
  async delete(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    await this.relationService.delete(apiKeyId, id);
    return { success: true };
  }
}
