/**
 * [INPUT]: apiKeyId, CreateMemoryDto, SearchMemoryDto
 * [OUTPUT]: Memory, MemoryWithSimilarity[]
 * [POS]: Memory 业务逻辑层
 *
 * 职责：Memory 的 CRUD 和语义搜索
 */

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { MemoryRepository, Memory, MemoryWithSimilarity } from './memory.repository';
import { EmbeddingService } from '../embedding/embedding.service';
import { QuotaService } from '../quota/quota.service';
import { UsageService, UsageType } from '../usage/usage.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CreateMemoryDto, SearchMemoryDto } from './dto';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly repository: MemoryRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly quotaService: QuotaService,
    private readonly usageService: UsageService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * 创建 Memory
   */
  async create(apiKeyId: string, dto: CreateMemoryDto): Promise<Memory> {
    // 检查配额
    const quotaCheck = await this.quotaService.checkMemoryQuota(apiKeyId);
    if (!quotaCheck.allowed) {
      throw new ForbiddenException(quotaCheck.reason);
    }

    // 生成向量
    const embeddingResult = await this.embeddingService.generateEmbedding(dto.content);

    // 创建 Memory
    const memory = await this.repository.createWithEmbedding(
      apiKeyId,
      {
        userId: dto.userId,
        agentId: dto.agentId,
        sessionId: dto.sessionId,
        content: dto.content,
        metadata: dto.metadata,
        source: dto.source,
        importance: dto.importance,
        tags: dto.tags ?? [],
      },
      embeddingResult.embedding,
    );

    // 记录用量 (Enterprise)
    const isEnterprise = await this.subscriptionService.isEnterpriseByApiKey(apiKeyId);
    if (isEnterprise) {
      await this.usageService.recordUsageByApiKey(apiKeyId, UsageType.MEMORY);
    }

    this.logger.log(`Created memory ${memory.id} for user ${dto.userId}`);
    return memory;
  }

  /**
   * 语义搜索 Memory
   */
  async search(apiKeyId: string, dto: SearchMemoryDto): Promise<MemoryWithSimilarity[]> {
    // 生成查询向量
    const embeddingResult = await this.embeddingService.generateEmbedding(dto.query);

    // 搜索相似 Memory
    const memories = await this.repository.searchSimilar(
      apiKeyId,
      dto.userId,
      embeddingResult.embedding,
      dto.limit,
      dto.threshold,
      dto.agentId,
      dto.sessionId,
    );

    return memories;
  }

  /**
   * 列出用户的 Memory
   */
  async list(
    apiKeyId: string,
    userId: string,
    options: { limit?: number; offset?: number; agentId?: string; sessionId?: string } = {},
  ): Promise<Memory[]> {
    const where: Record<string, any> = { userId };
    if (options.agentId) {
      where.agentId = options.agentId;
    }
    if (options.sessionId) {
      where.sessionId = options.sessionId;
    }

    return this.repository.findMany(apiKeyId, {
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 20,
      skip: options.offset ?? 0,
    });
  }

  /**
   * 获取单个 Memory
   */
  async getById(apiKeyId: string, id: string): Promise<Memory | null> {
    return this.repository.findById(apiKeyId, id);
  }

  /**
   * 删除 Memory
   */
  async delete(apiKeyId: string, id: string): Promise<void> {
    await this.repository.deleteById(apiKeyId, id);
    this.logger.log(`Deleted memory ${id}`);
  }

  /**
   * 删除用户的所有 Memory
   */
  async deleteByUser(apiKeyId: string, userId: string): Promise<void> {
    await this.repository.delete(apiKeyId, { userId });
    this.logger.log(`Deleted all memories for user ${userId}`);
  }
}
