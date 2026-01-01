/**
 * [INPUT]: ScreenshotOptions, userId, apiKeyId
 * [OUTPUT]: ScreenshotResponse
 * [POS]: 截图业务逻辑层，协调 Repository、Redis、Queue，实现完整截图流程
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { ScreenshotRepository } from './screenshot.repository';
import { RedisService } from '../redis/redis.service';
import { QuotaService } from '../quota/quota.service';
import { UrlValidator } from './url-validator';
import { SCREENSHOT_QUEUE } from '../queue/queue.constants';
import type { SubscriptionTier } from '../types/tier.types';
import type {
  ScreenshotOptions,
  ScreenshotResponse,
  ScreenshotResponseData,
  ScreenshotCacheData,
  ScreenshotJobData,
  RequestContext,
} from './screenshot.types';
import type { Screenshot, QuotaSource } from '../../generated/prisma/client';
import {
  generateRequestHash,
  CACHE_TTL_SECONDS,
  CACHE_KEY_PREFIX,
  DEFAULT_SYNC_TIMEOUT,
  MAX_SYNC_TIMEOUT,
} from './screenshot.constants';
import { FeatureNotAllowedError, InvalidParamsError } from './screenshot.errors';

@Injectable()
export class ScreenshotService implements OnModuleDestroy {
  private readonly logger = new Logger(ScreenshotService.name);
  private queueEvents: QueueEvents | null = null;

  constructor(
    private readonly repository: ScreenshotRepository,
    private readonly redis: RedisService,
    private readonly quotaService: QuotaService,
    private readonly urlValidator: UrlValidator,
    private readonly configService: ConfigService,
    @InjectQueue(SCREENSHOT_QUEUE) private readonly screenshotQueue: Queue,
  ) {}

  /**
   * 模块销毁时清理资源
   */
  async onModuleDestroy(): Promise<void> {
    if (this.queueEvents) {
      await this.queueEvents.close();
      this.queueEvents = null;
    }
  }

  // ============ 主入口 ============

  /**
   * 创建截图请求
   * 完整流程：验证 → 缓存检查 → 配额预扣 → 并发控制 → 任务入队 → 等待结果
   */
  async createScreenshot(ctx: RequestContext): Promise<ScreenshotResponse> {
    const { userId, apiKeyId, tier, options } = ctx;

    // 1. URL 安全验证
    await this.urlValidator.validate(options.url);

    // 2. 参数和权限验证
    this.validateOptions(options, tier);

    // 3. 生成请求哈希
    const requestHash = generateRequestHash(options);

    // 4. 检查缓存
    const cached = await this.checkCache(requestHash);
    if (cached) {
      this.logger.debug(`Cache hit for ${requestHash}`);
      // 创建缓存命中记录
      const screenshot = await this.repository.createFromCache({
        userId,
        apiKeyId,
        url: options.url,
        requestHash,
        request: options,
        fileUrl: cached.fileUrl,
        fileSize: cached.fileSize,
        processingMs: 0,
        meta: cached.meta,
      });

      return this.buildResponse(screenshot, cached);
    }

    // 5. 检查是否有相同请求正在处理
    const processingId = await this.redis.tryAcquireProcessingLock(requestHash, 'pending', 120);
    if (processingId && processingId !== 'pending') {
      // 有相同请求正在处理，等待其完成
      this.logger.debug(`Waiting for processing request: ${processingId}`);
      return this.waitForExistingJob(processingId, options.timeout);
    }

    // 6. 频率限制检查
    await this.quotaService.checkRateLimit(userId, tier);

    // 7. 配额预扣
    const deductResult = await this.quotaService.deductOrThrow(userId, 1, requestHash);
    const quotaSource = deductResult.source;

    // 8. 并发控制
    try {
      await this.quotaService.incrementConcurrent(userId, tier);
    } catch (error) {
      // 并发超限，返还配额
      await this.quotaService.refund({
        userId,
        screenshotId: requestHash,
        source: quotaSource,
        amount: 1,
      });
      throw error;
    }

    // 9. 创建截图记录
    const screenshot = await this.repository.create({
      userId,
      apiKeyId,
      url: options.url,
      requestHash,
      request: options,
      quotaDeducted: true,
      quotaSource,
    });

    // 更新处理锁为实际的 screenshotId
    await this.redis.tryAcquireProcessingLock(requestHash, screenshot.id, 120);

    // 10. 推送任务到队列
    const jobData: ScreenshotJobData = {
      screenshotId: screenshot.id,
      userId,
      apiKeyId,
      url: options.url,
      requestHash,
      options,
      quotaSource,
      tier,
    };

    const job = await this.screenshotQueue.add('capture', jobData, {
      jobId: screenshot.id,
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.debug(`Job created: ${job.id}`);

    // 11. 同步等待或异步返回
    if (options.sync) {
      return this.waitForJob(screenshot.id, options.timeout);
    } else {
      // 异步模式：立即返回任务 ID
      return {
        success: true,
        data: {
          id: screenshot.id,
          url: '', // 异步模式暂无 URL
          width: options.width,
          height: options.height,
          format: options.format,
          fileSize: 0,
          fromCache: false,
          processingMs: 0,
        },
      };
    }
  }

  /**
   * 查询截图结果
   */
  async getScreenshot(screenshotId: string, userId: string): Promise<ScreenshotResponse | null> {
    const screenshot = await this.repository.findByIdAndUser(screenshotId, userId);

    if (!screenshot) {
      return null;
    }

    return this.buildResponseFromRecord(screenshot);
  }

  // ============ 缓存操作 ============

  /**
   * 检查缓存
   */
  private async checkCache(requestHash: string): Promise<ScreenshotCacheData | null> {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${requestHash}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached) as ScreenshotCacheData;
      }
    } catch (error) {
      this.logger.warn(`Cache read error: ${error}`);
    }

    return null;
  }

  /**
   * 设置缓存
   */
  async setCache(requestHash: string, data: ScreenshotCacheData): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${requestHash}`;
      const ttl = this.configService.get<number>('SCREENSHOT_CACHE_TTL', CACHE_TTL_SECONDS);
      await this.redis.set(cacheKey, JSON.stringify(data), ttl);
    } catch (error) {
      this.logger.warn(`Cache write error: ${error}`);
    }
  }

  // ============ 任务等待 ============

  /**
   * 等待任务完成
   */
  private async waitForJob(screenshotId: string, timeout: number): Promise<ScreenshotResponse> {
    const effectiveTimeout = Math.min(timeout, MAX_SYNC_TIMEOUT);

    try {
      // 获取或创建 QueueEvents
      const queueEvents = await this.getQueueEvents();

      // 等待任务完成
      const result = await new Promise<ScreenshotResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Screenshot timeout after ${effectiveTimeout}ms`));
        }, effectiveTimeout);

        // 监听任务完成事件
        const onCompleted = async ({ jobId }: { jobId: string }) => {
          if (jobId === screenshotId) {
            clearTimeout(timer);
            queueEvents.off('completed', onCompleted);
            queueEvents.off('failed', onFailed);

            // 获取最终结果
            const screenshot = await this.repository.findById(screenshotId);
            if (screenshot && screenshot.status === 'COMPLETED') {
              resolve(this.buildResponseFromRecord(screenshot));
            } else {
              reject(new Error('Screenshot processing failed'));
            }
          }
        };

        const onFailed = async ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
          if (jobId === screenshotId) {
            clearTimeout(timer);
            queueEvents.off('completed', onCompleted);
            queueEvents.off('failed', onFailed);
            reject(new Error(failedReason || 'Screenshot processing failed'));
          }
        };

        queueEvents.on('completed', onCompleted);
        queueEvents.on('failed', onFailed);
      });

      return result;
    } catch (error) {
      // 超时或失败，获取当前状态
      const screenshot = await this.repository.findById(screenshotId);

      if (screenshot?.status === 'COMPLETED') {
        return this.buildResponseFromRecord(screenshot);
      }

      throw error;
    }
  }

  /**
   * 等待已存在的任务
   */
  private async waitForExistingJob(
    screenshotId: string,
    timeout: number,
  ): Promise<ScreenshotResponse> {
    return this.waitForJob(screenshotId, timeout);
  }

  /**
   * 获取 QueueEvents（延迟初始化）
   */
  private async getQueueEvents(): Promise<QueueEvents> {
    if (!this.queueEvents) {
      const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
      this.queueEvents = new QueueEvents(SCREENSHOT_QUEUE, {
        connection: { url: redisUrl },
      });
      await this.queueEvents.waitUntilReady();
    }
    return this.queueEvents;
  }

  // ============ 参数验证 ============

  /**
   * 验证截图选项和权限
   */
  private validateOptions(options: ScreenshotOptions, tier: SubscriptionTier): void {
    const limits = this.quotaService.getTierLimits(tier);

    // 尺寸限制
    if (options.width > limits.maxWidth) {
      throw new InvalidParamsError(
        `Width exceeds limit for ${tier} tier (max: ${limits.maxWidth})`,
        { width: options.width, maxWidth: limits.maxWidth },
      );
    }

    if (options.height > limits.maxHeight) {
      throw new InvalidParamsError(
        `Height exceeds limit for ${tier} tier (max: ${limits.maxHeight})`,
        { height: options.height, maxHeight: limits.maxHeight },
      );
    }

    // 延迟限制
    if (options.delay > limits.maxDelay) {
      throw new InvalidParamsError(
        `Delay exceeds limit for ${tier} tier (max: ${limits.maxDelay}ms)`,
        { delay: options.delay, maxDelay: limits.maxDelay },
      );
    }

    // 功能权限检查
    if (options.clip && !this.quotaService.isFeatureAllowed(tier, 'clip')) {
      throw new FeatureNotAllowedError('clip', tier);
    }

    if (options.scripts && !this.quotaService.isFeatureAllowed(tier, 'scripts')) {
      throw new FeatureNotAllowedError('scripts', tier);
    }

    if (options.fullPage && !this.quotaService.isFeatureAllowed(tier, 'fullPage')) {
      throw new FeatureNotAllowedError('fullPage', tier);
    }
  }

  // ============ 响应构建 ============

  /**
   * 从缓存数据构建响应
   */
  private buildResponse(
    screenshot: Screenshot,
    cached: ScreenshotCacheData,
  ): ScreenshotResponse {
    return {
      success: true,
      data: {
        id: screenshot.id,
        url: cached.fileUrl,
        width: cached.width,
        height: cached.height,
        format: cached.format,
        fileSize: cached.fileSize,
        fromCache: true,
        processingMs: cached.processingMs,
        meta: cached.meta,
      },
    };
  }

  /**
   * 从数据库记录构建响应
   */
  private buildResponseFromRecord(screenshot: Screenshot): ScreenshotResponse {
    const request = screenshot.request as unknown as ScreenshotOptions;

    const data: ScreenshotResponseData = {
      id: screenshot.id,
      url: screenshot.fileUrl || '',
      width: request.width,
      height: request.height,
      format: request.format,
      fileSize: screenshot.fileSize || 0,
      fromCache: screenshot.fromCache,
      processingMs: screenshot.processingMs || 0,
    };

    // 添加元信息
    if (screenshot.pageTitle || screenshot.pageDesc || screenshot.pageFavicon) {
      data.meta = {
        title: screenshot.pageTitle || undefined,
        description: screenshot.pageDesc || undefined,
        favicon: screenshot.pageFavicon || undefined,
      };
    }

    // 添加时间统计（仅当请求 includeTimings 时）
    if (request.includeTimings) {
      data.timings = {
        queueWaitMs: screenshot.queueWaitMs ?? undefined,
        pageLoadMs: screenshot.pageLoadMs ?? undefined,
        captureMs: screenshot.captureMs ?? undefined,
        imageProcessMs: screenshot.imageProcessMs ?? undefined,
        uploadMs: screenshot.uploadMs ?? undefined,
        totalMs: screenshot.processingMs || 0,
      };
    }

    return { success: true, data };
  }

  // ============ 配额管理 ============

  /**
   * 返还配额（供 Processor 调用）
   */
  async refundQuota(
    userId: string,
    screenshotId: string,
    quotaSource: QuotaSource,
  ): Promise<void> {
    try {
      await this.quotaService.refund({
        userId,
        screenshotId,
        source: quotaSource,
        amount: 1,
      });

      // 更新记录
      await this.repository.updateQuotaDeducted(screenshotId, false);

      this.logger.debug(`Refunded quota for screenshot ${screenshotId}`);
    } catch (error) {
      this.logger.error(`Failed to refund quota: ${error}`);
    }
  }

  /**
   * 减少并发计数（供 Processor 调用）
   */
  async decrementConcurrent(userId: string): Promise<void> {
    await this.quotaService.decrementConcurrent(userId);
  }

  /**
   * 释放处理锁（供 Processor 调用）
   */
  async releaseProcessingLock(requestHash: string): Promise<void> {
    await this.redis.releaseProcessingLock(requestHash);
  }
}
