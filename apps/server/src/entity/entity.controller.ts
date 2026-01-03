/**
 * [POS]: Entity API Controller
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
import { EntityService } from './entity.service';
import { CreateEntityDto } from './dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';

@Controller({ path: 'entities', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  /**
   * 创建实体
   * POST /api/v1/entities
   */
  @Post()
  async create(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: CreateEntityDto,
  ) {
    const entity = await this.entityService.create(apiKeyId, dto);
    return { success: true, data: entity };
  }

  /**
   * 批量创建实体
   * POST /api/v1/entities/batch
   */
  @Post('batch')
  async createMany(
    @ApiKeyId() apiKeyId: string,
    @Body() dtos: CreateEntityDto[],
  ) {
    const entities = await this.entityService.createMany(apiKeyId, dtos);
    return { success: true, data: entities };
  }

  /**
   * 列出实体
   * GET /api/v1/entities?userId=xxx
   */
  @Get()
  async list(
    @ApiKeyId() apiKeyId: string,
    @Query('userId') userId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const entities = await this.entityService.list(apiKeyId, userId, {
      type,
      limit,
      offset,
    });
    return { success: true, data: entities };
  }

  /**
   * 获取单个实体
   * GET /api/v1/entities/:id
   */
  @Get(':id')
  async getById(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    const entity = await this.entityService.getById(apiKeyId, id);
    return { success: true, data: entity };
  }

  /**
   * 删除实体
   * DELETE /api/v1/entities/:id
   */
  @Delete(':id')
  async delete(
    @ApiKeyId() apiKeyId: string,
    @Param('id') id: string,
  ) {
    await this.entityService.delete(apiKeyId, id);
    return { success: true };
  }
}
