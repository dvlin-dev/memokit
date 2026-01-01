/**
 * [POS]: Entity Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { EntityRepository, Entity } from './entity.repository';
import { CreateEntityDto } from './dto';

@Injectable()
export class EntityService {
  private readonly logger = new Logger(EntityService.name);

  constructor(private readonly repository: EntityRepository) {}

  /**
   * 创建实体
   */
  async create(apiKeyId: string, dto: CreateEntityDto): Promise<Entity> {
    const entity = await this.repository.create(apiKeyId, {
      userId: dto.userId,
      type: dto.type,
      name: dto.name,
      properties: dto.properties,
      confidence: dto.confidence ?? 1.0,
    });

    this.logger.log(`Created entity ${entity.id}: ${dto.type}/${dto.name}`);
    return entity;
  }

  /**
   * 创建或更新实体
   */
  async upsert(apiKeyId: string, dto: CreateEntityDto): Promise<Entity> {
    return this.repository.upsert(apiKeyId, {
      userId: dto.userId,
      type: dto.type,
      name: dto.name,
      properties: dto.properties,
      confidence: dto.confidence ?? 1.0,
    });
  }

  /**
   * 批量创建实体
   */
  async createMany(apiKeyId: string, dtos: CreateEntityDto[]): Promise<Entity[]> {
    const entities: Entity[] = [];
    for (const dto of dtos) {
      const entity = await this.upsert(apiKeyId, dto);
      entities.push(entity);
    }
    return entities;
  }

  /**
   * 列出用户的实体
   */
  async list(
    apiKeyId: string,
    userId: string,
    options: { type?: string; limit?: number; offset?: number } = {},
  ): Promise<Entity[]> {
    const where: Record<string, any> = { userId };
    if (options.type) {
      where.type = options.type;
    }

    return this.repository.findMany(apiKeyId, {
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
    });
  }

  /**
   * 获取单个实体
   */
  async getById(apiKeyId: string, id: string): Promise<Entity | null> {
    return this.repository.findById(apiKeyId, id);
  }

  /**
   * 按类型查找实体
   */
  async getByType(apiKeyId: string, userId: string, type: string): Promise<Entity[]> {
    return this.repository.findByType(apiKeyId, userId, type);
  }

  /**
   * 删除实体
   */
  async delete(apiKeyId: string, id: string): Promise<void> {
    await this.repository.deleteById(apiKeyId, id);
    this.logger.log(`Deleted entity ${id}`);
  }
}
