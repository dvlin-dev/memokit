/**
 * [INPUT]: BullMQ Job (ScreenshotJobData)
 * [OUTPUT]: 截图文件 URL
 * [POS]: BullMQ 任务处理器，执行实际的截图操作
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { ScreenshotRepository } from './screenshot.repository';
import { ScreenshotService } from './screenshot.service';
import { R2Service } from '../storage/r2.service';
import { BrowserPool } from '../browser';
import { PageRenderer } from './page-renderer';
import { ImageProcessor } from './image-processor';
import { SCREENSHOT_QUEUE } from '../queue/queue.constants';
import type { ScreenshotJobData, ScreenshotCacheData } from './screenshot.types';
import {
  generateFilePath,
  calculateFileExpiresAt,
  getContentType,
} from './screenshot.constants';
import { getErrorMessage } from './screenshot.errors';

@Processor(SCREENSHOT_QUEUE)
export class ScreenshotProcessor extends WorkerHost {
  private readonly logger = new Logger(ScreenshotProcessor.name);

  constructor(
    private readonly repository: ScreenshotRepository,
    private readonly screenshotService: ScreenshotService,
    private readonly r2Service: R2Service,
    private readonly browserPool: BrowserPool,
    private readonly pageRenderer: PageRenderer,
    private readonly imageProcessor: ImageProcessor,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  /**
   * 处理截图任务
   */
  async process(job: Job<ScreenshotJobData>): Promise<void> {
    const { screenshotId, userId, requestHash, options, quotaSource, tier } = job.data;
    const startTime = Date.now();

    // 计算队列等待时间（Job 创建时间到开始处理）
    const queueWaitMs = job.timestamp ? Date.now() - job.timestamp : 0;

    this.logger.debug(`Processing screenshot job: ${screenshotId}`);

    // 更新状态为处理中
    await this.repository.updateToProcessing(screenshotId);

    let context = null;

    try {
      // 1. 获取浏览器上下文
      context = await this.browserPool.acquireContext();

      // 2. 渲染页面并截图
      const renderResult = await this.pageRenderer.render(context, options);

      // 3. 图片后处理
      const needWatermark = tier === 'FREE';
      const processResult = await this.imageProcessor.process(renderResult.buffer, {
        format: options.format,
        quality: options.quality,
        addWatermark: needWatermark,
      });

      // 4. 上传到 R2（记录时间）
      const uploadStart = Date.now();
      const filePath = generateFilePath(screenshotId, options.format);
      const contentType = getContentType(options.format);

      await this.r2Service.uploadFile(
        'screenshots', // userId placeholder for screenshots
        'public',      // vaultId placeholder
        filePath,
        processResult.buffer,
        contentType,
      );
      const uploadMs = Date.now() - uploadStart;

      // 5. 生成 CDN URL
      const publicUrl = this.configService.get<string>('R2_PUBLIC_URL', '');
      const objectKey = `screenshots/public/${filePath}`;
      const fileUrl = `${publicUrl}/${objectKey}`;

      // 6. 计算处理时间和文件过期时间
      const processingMs = Date.now() - startTime;
      const fileExpiresAt = calculateFileExpiresAt(tier);

      // 7. 更新数据库记录（包含时间统计）
      await this.repository.updateToCompleted(screenshotId, {
        fileUrl,
        fileSize: processResult.fileSize,
        fileExpiresAt,
        processingMs,
        meta: renderResult.meta,
        // 时间统计
        queueWaitMs,
        pageLoadMs: renderResult.timings.pageLoadMs,
        captureMs: renderResult.timings.captureMs,
        imageProcessMs: processResult.processingMs,
        uploadMs,
      });

      // 8. 写入缓存
      const cacheData: ScreenshotCacheData = {
        screenshotId,
        fileUrl,
        fileSize: processResult.fileSize,
        width: processResult.width,
        height: processResult.height,
        format: options.format,
        meta: renderResult.meta,
        processingMs,
        createdAt: new Date().toISOString(),
      };
      await this.screenshotService.setCache(requestHash, cacheData);

      // 9. 释放处理锁
      await this.screenshotService.releaseProcessingLock(requestHash);

      this.logger.log(
        `Screenshot completed: ${screenshotId}, size: ${processResult.fileSize}, time: ${processingMs}ms`,
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      this.logger.error(`Screenshot failed: ${screenshotId} - ${errorMessage}`);

      // 更新为失败状态
      await this.repository.updateToFailed(screenshotId, errorMessage);

      // 返还配额
      await this.screenshotService.refundQuota(userId, screenshotId, quotaSource);

      // 释放处理锁
      await this.screenshotService.releaseProcessingLock(requestHash);

      // 重新抛出错误，让 BullMQ 处理重试逻辑
      throw error;
    } finally {
      // 释放浏览器上下文
      if (context) {
        await this.browserPool.releaseContext(context);
      }

      // 减少并发计数
      await this.screenshotService.decrementConcurrent(userId);
    }
  }

  /**
   * 任务完成事件
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job<ScreenshotJobData>) {
    this.logger.debug(`Job completed: ${job.id}`);
  }

  /**
   * 任务失败事件（所有重试都失败后）
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<ScreenshotJobData>, error: Error) {
    const { screenshotId, userId, requestHash, quotaSource } = job.data;

    this.logger.error(`Job failed after all retries: ${job.id} - ${error.message}`);

    // 确保状态已更新为失败
    const screenshot = await this.repository.findById(screenshotId);
    if (screenshot && screenshot.status !== 'FAILED') {
      await this.repository.updateToFailed(screenshotId, error.message);
    }

    // 确保配额已返还
    if (screenshot?.quotaDeducted) {
      await this.screenshotService.refundQuota(userId, screenshotId, quotaSource);
    }

    // 释放处理锁
    await this.screenshotService.releaseProcessingLock(requestHash);
  }

  /**
   * 任务错误事件（单次执行失败）
   */
  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`Worker error: ${error.message}`);
  }
}
