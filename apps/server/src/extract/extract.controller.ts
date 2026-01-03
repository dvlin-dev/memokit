/**
 * [POS]: Extract API Controller
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ExtractService, ExtractOptions } from './extract.service';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';

export class ExtractDto {
  text!: string;
  userId!: string;
  entityTypes?: string[];
  relationTypes?: string[];
  minConfidence?: number;
  saveToGraph?: boolean;
}

export class ExtractBatchDto {
  texts!: string[];
  userId!: string;
  entityTypes?: string[];
  relationTypes?: string[];
  minConfidence?: number;
  saveToGraph?: boolean;
}

export class PreviewDto {
  text!: string;
  entityTypes?: string[];
  relationTypes?: string[];
}

@Controller({ path: 'extract', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class ExtractController {
  constructor(private readonly extractService: ExtractService) {}

  /**
   * 从文本提取实体和关系
   * POST /api/v1/extract
   */
  @Post()
  async extract(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: ExtractDto,
  ) {
    return this.extractService.extractFromText(apiKeyId, dto.text, {
      userId: dto.userId,
      entityTypes: dto.entityTypes,
      relationTypes: dto.relationTypes,
      minConfidence: dto.minConfidence,
      saveToGraph: dto.saveToGraph ?? true,
    });
  }

  /**
   * 批量提取
   * POST /api/v1/extract/batch
   */
  @Post('batch')
  async extractBatch(
    @ApiKeyId() apiKeyId: string,
    @Body() dto: ExtractBatchDto,
  ) {
    return this.extractService.extractFromTexts(apiKeyId, dto.texts, {
      userId: dto.userId,
      entityTypes: dto.entityTypes,
      relationTypes: dto.relationTypes,
      minConfidence: dto.minConfidence,
      saveToGraph: dto.saveToGraph ?? true,
    });
  }

  /**
   * 预览提取结果（不保存）
   * POST /api/v1/extract/preview
   */
  @Post('preview')
  async preview(
    @Body() dto: PreviewDto,
  ) {
    return this.extractService.preview(dto.text, {
      entityTypes: dto.entityTypes,
      relationTypes: dto.relationTypes,
    });
  }
}
