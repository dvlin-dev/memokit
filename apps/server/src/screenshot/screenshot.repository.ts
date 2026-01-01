/**
 * [INPUT]: screenshotId, userId, 截图操作参数
 * [OUTPUT]: Screenshot 实体
 * [POS]: 截图数据访问层，封装 Prisma 操作，不含业务逻辑
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  Screenshot,
  ScreenshotStatus,
  QuotaSource,
  Prisma,
} from '../../generated/prisma/client';
import type { ScreenshotOptions, PageMeta } from './screenshot.types';

/** 创建截图记录参数 */
export interface CreateScreenshotParams {
  userId: string;
  apiKeyId: string | null;
  url: string;
  requestHash: string;
  request: ScreenshotOptions;
  quotaDeducted: boolean;
  quotaSource: QuotaSource | null;
}

/** 完成截图记录参数 */
export interface CompleteScreenshotParams {
  fileUrl: string;
  fileSize: number;
  fileExpiresAt: Date;
  processingMs: number;
  meta: PageMeta;
  // 时间统计
  queueWaitMs?: number;
  pageLoadMs?: number;
  captureMs?: number;
  imageProcessMs?: number;
  uploadMs?: number;
}

/** 缓存命中创建参数 */
export interface CreateFromCacheParams {
  userId: string;
  apiKeyId: string | null;
  url: string;
  requestHash: string;
  request: ScreenshotOptions;
  fileUrl: string;
  fileSize: number;
  processingMs: number;
  meta: PageMeta;
}

@Injectable()
export class ScreenshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============ 查询操作 ============

  /**
   * 根据 ID 查询截图记录
   */
  async findById(id: string): Promise<Screenshot | null> {
    return this.prisma.screenshot.findUnique({
      where: { id },
    });
  }

  /**
   * 根据 ID 查询（必须属��指定用户）
   */
  async findByIdAndUser(id: string, userId: string): Promise<Screenshot | null> {
    return this.prisma.screenshot.findFirst({
      where: { id, userId },
    });
  }

  /**
   * 根据请求哈希查询（用于缓存查找）
   */
  async findByRequestHash(requestHash: string): Promise<Screenshot | null> {
    return this.prisma.screenshot.findFirst({
      where: {
        requestHash,
        status: 'COMPLETED',
        // 文件未过期
        fileExpiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 查询用户的截图列表
   */
  async findByUser(
    userId: string,
    options?: {
      status?: ScreenshotStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<Screenshot[]> {
    const where: Prisma.ScreenshotWhereInput = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    return this.prisma.screenshot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });
  }

  /**
   * 统计用户的截图数量
   */
  async countByUser(userId: string, status?: ScreenshotStatus): Promise<number> {
    const where: Prisma.ScreenshotWhereInput = { userId };

    if (status) {
      where.status = status;
    }

    return this.prisma.screenshot.count({ where });
  }

  // ============ 创建操作 ============

  /**
   * 创建截图记录（状态为 PENDING）
   */
  async create(params: CreateScreenshotParams): Promise<Screenshot> {
    return this.prisma.screenshot.create({
      data: {
        userId: params.userId,
        apiKeyId: params.apiKeyId,
        url: params.url,
        requestHash: params.requestHash,
        request: params.request as unknown as Prisma.InputJsonValue,
        quotaDeducted: params.quotaDeducted,
        quotaSource: params.quotaSource,
        status: 'PENDING',
        fromCache: false,
      },
    });
  }

  /**
   * 创建缓存命中的截图记录
   */
  async createFromCache(params: CreateFromCacheParams): Promise<Screenshot> {
    return this.prisma.screenshot.create({
      data: {
        userId: params.userId,
        apiKeyId: params.apiKeyId,
        url: params.url,
        requestHash: params.requestHash,
        request: params.request as unknown as Prisma.InputJsonValue,
        quotaDeducted: false, // 缓存命中不扣配额
        quotaSource: null,
        status: 'COMPLETED',
        fileUrl: params.fileUrl,
        fileSize: params.fileSize,
        processingMs: params.processingMs,
        pageTitle: params.meta.title,
        pageDesc: params.meta.description,
        pageFavicon: params.meta.favicon,
        fromCache: true,
        completedAt: new Date(),
      },
    });
  }

  // ============ 更新操作 ============

  /**
   * 更新状态为处理中
   */
  async updateToProcessing(id: string): Promise<Screenshot> {
    return this.prisma.screenshot.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });
  }

  /**
   * 更新为完成状态
   */
  async updateToCompleted(
    id: string,
    params: CompleteScreenshotParams,
  ): Promise<Screenshot> {
    return this.prisma.screenshot.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        fileUrl: params.fileUrl,
        fileSize: params.fileSize,
        fileExpiresAt: params.fileExpiresAt,
        processingMs: params.processingMs,
        pageTitle: params.meta.title,
        pageDesc: params.meta.description,
        pageFavicon: params.meta.favicon,
        completedAt: new Date(),
        // 时间统计
        queueWaitMs: params.queueWaitMs,
        pageLoadMs: params.pageLoadMs,
        captureMs: params.captureMs,
        imageProcessMs: params.imageProcessMs,
        uploadMs: params.uploadMs,
      },
    });
  }

  /**
   * 更新为失败状态
   */
  async updateToFailed(id: string, error: string): Promise<Screenshot> {
    return this.prisma.screenshot.update({
      where: { id },
      data: {
        status: 'FAILED',
        error,
        completedAt: new Date(),
      },
    });
  }

  /**
   * 更新配额扣减状态（用于返还配额后）
   */
  async updateQuotaDeducted(id: string, deducted: boolean): Promise<Screenshot> {
    return this.prisma.screenshot.update({
      where: { id },
      data: {
        quotaDeducted: deducted,
        quotaSource: deducted ? undefined : null,
      },
    });
  }

  // ============ 批量操作 ============

  /**
   * 查询超时的 PENDING 记录（用于配额返还）
   */
  async findStaleRecords(maxAgeMinutes: number): Promise<Screenshot[]> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - maxAgeMinutes);

    return this.prisma.screenshot.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        quotaDeducted: true,
        createdAt: { lt: cutoff },
      },
    });
  }

  /**
   * 查询过期的文件（用于清理）
   */
  async findExpiredFiles(limit: number): Promise<Screenshot[]> {
    return this.prisma.screenshot.findMany({
      where: {
        fileExpiresAt: { lt: new Date() },
        fileUrl: { not: null },
      },
      take: limit,
    });
  }

  /**
   * 清除过期文件的 URL
   */
  async clearExpiredFileUrl(id: string): Promise<void> {
    await this.prisma.screenshot.update({
      where: { id },
      data: { fileUrl: null },
    });
  }
}
