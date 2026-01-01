/**
 * [INPUT]: userId, UsageType, quantity
 * [OUTPUT]: UsageRecord, UsageSummary
 * [POS]: 用量记录服务，用于 Enterprise 按量计费
 *
 * 职责：只负责记录和查询用量，不做配额检查
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum UsageType {
  MEMORY = 'MEMORY',
  API_CALL = 'API_CALL',
}

export interface UsageSummary {
  memories: number;
  apiCalls: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录用量
   */
  async recordUsage(
    userId: string,
    type: UsageType,
    quantity: number = 1,
  ): Promise<void> {
    await this.prisma.usageRecord.create({
      data: {
        userId,
        type,
        quantity,
        billingPeriod: this.getCurrentBillingPeriod(),
      },
    });

    this.logger.debug(`Recorded usage: user=${userId}, type=${type}, quantity=${quantity}`);
  }

  /**
   * 通过 API Key 记录用量
   */
  async recordUsageByApiKey(
    apiKeyId: string,
    type: UsageType,
    quantity: number = 1,
  ): Promise<void> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { userId: true },
    });

    if (!apiKey) {
      this.logger.warn(`API Key not found: ${apiKeyId}`);
      return;
    }

    await this.recordUsage(apiKey.userId, type, quantity);
  }

  /**
   * 获取指定账期的用量汇总
   */
  async getMonthlyUsage(userId: string, billingPeriod?: string): Promise<UsageSummary> {
    const period = billingPeriod ?? this.getCurrentBillingPeriod();

    const records = await this.prisma.usageRecord.groupBy({
      by: ['type'],
      where: { userId, billingPeriod: period },
      _sum: { quantity: true },
    });

    return {
      memories: records.find((r) => r.type === 'MEMORY')?._sum.quantity ?? 0,
      apiCalls: records.find((r) => r.type === 'API_CALL')?._sum.quantity ?? 0,
    };
  }

  /**
   * 获取用户所有账期的用量记录
   */
  async getUsageHistory(
    userId: string,
    limit: number = 12,
  ): Promise<Array<{ billingPeriod: string } & UsageSummary>> {
    const periods = await this.prisma.usageRecord.groupBy({
      by: ['billingPeriod'],
      where: { userId },
      orderBy: { billingPeriod: 'desc' },
      take: limit,
    });

    const result: Array<{ billingPeriod: string } & UsageSummary> = [];

    for (const period of periods) {
      const usage = await this.getMonthlyUsage(userId, period.billingPeriod);
      result.push({
        billingPeriod: period.billingPeriod,
        ...usage,
      });
    }

    return result;
  }

  /**
   * 获取当前账期标识 (格式: "2026-01")
   */
  private getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
