/**
 * [INPUT]: 浏览器实例请求
 * [OUTPUT]: Playwright BrowserContext 实例
 * [POS]: 浏览器实例池管理，复用实例，自动回收，健康检查
 *
 * 作为独立基础设施模块，供 screenshot、automation 等模块复用
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { chromium, type BrowserContext } from 'playwright';
import type { BrowserInstance, WaitingRequest, BrowserPoolStatus } from './browser.types';
import {
  BROWSER_POOL_SIZE,
  BROWSER_IDLE_TIMEOUT,
  BROWSER_ACQUIRE_TIMEOUT,
  MAX_PAGES_PER_BROWSER,
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_VIEWPORT_HEIGHT,
} from './browser.constants';

/** 浏览器不可用错误 */
export class BrowserUnavailableError extends Error {
  constructor(message: string) {
    super(`Browser unavailable: ${message}`);
    this.name = 'BrowserUnavailableError';
  }
}

@Injectable()
export class BrowserPool implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserPool.name);

  /** 浏览器实例池 */
  private readonly instances: BrowserInstance[] = [];

  /** 等待队列 */
  private readonly waitingQueue: WaitingRequest[] = [];

  /** 清理定时器 */
  private cleanupTimer: NodeJS.Timeout | null = null;

  /** 是否正在关闭 */
  private isShuttingDown = false;

  async onModuleInit() {
    this.logger.log(`Initializing browser pool with size: ${BROWSER_POOL_SIZE}`);

    // 预热：创建一个浏览器实例
    try {
      await this.createInstance();
      this.logger.log('Browser pool warmed up');
    } catch (error) {
      this.logger.error('Failed to warm up browser pool', error);
    }

    // 启动定期清理
    this.startCleanupTimer();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    this.logger.log('Shutting down browser pool');

    // 停止清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // 拒绝所有等待中的请求
    for (const request of this.waitingQueue) {
      clearTimeout(request.timeoutId);
      request.reject(new Error('Browser pool is shutting down'));
    }
    this.waitingQueue.length = 0;

    // 关闭所有浏览器实例
    await this.closeAllInstances();
  }

  /**
   * 获取浏览器上下文
   * 如果池已满且没有可用实例，会排队等待
   */
  async acquireContext(): Promise<BrowserContext> {
    if (this.isShuttingDown) {
      throw new BrowserUnavailableError('Browser pool is shutting down');
    }

    // 查找可用的浏览器实例
    const instance = this.findAvailableInstance();

    if (instance) {
      return this.createContextFromInstance(instance);
    }

    // 如果池未满，创建新实例
    if (this.instances.length < BROWSER_POOL_SIZE) {
      const newInstance = await this.createInstance();
      return this.createContextFromInstance(newInstance);
    }

    // 池已满，排队等待
    return this.waitForAvailableContext();
  }

  /**
   * 释放浏览器上下文
   */
  async releaseContext(context: BrowserContext): Promise<void> {
    try {
      // 关闭上下文
      await context.close();

      // 更新实例状态
      const browser = context.browser();
      if (browser) {
        const instance = this.instances.find((i) => i.browser === browser);
        if (instance) {
          instance.pageCount = Math.max(0, instance.pageCount - 1);
          instance.lastUsedAt = Date.now();

          // 检查是否有等待的请求
          this.processWaitingQueue();
        }
      }
    } catch (error) {
      this.logger.warn(`Error releasing context: ${error}`);
    }
  }

  /**
   * 获取池状态（用于健康检查）
   */
  getPoolStatus(): BrowserPoolStatus {
    const healthy = this.instances.filter((i) => i.isHealthy).length;
    const totalPages = this.instances.reduce((sum, i) => sum + i.pageCount, 0);

    return {
      total: this.instances.length,
      healthy,
      totalPages,
      waitingCount: this.waitingQueue.length,
    };
  }

  /**
   * 创建新的浏览器实例
   */
  private async createInstance(): Promise<BrowserInstance> {
    this.logger.debug('Creating new browser instance');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        // 限制内存使用
        '--js-flags=--max-old-space-size=512',
      ],
    });

    const instance: BrowserInstance = {
      browser,
      pageCount: 0,
      lastUsedAt: Date.now(),
      isHealthy: true,
    };

    // 监听断开连接
    browser.on('disconnected', () => {
      this.logger.warn('Browser disconnected unexpectedly');
      this.handleBrowserDisconnect(instance);
    });

    this.instances.push(instance);
    this.logger.debug(`Browser instance created. Pool size: ${this.instances.length}`);

    return instance;
  }

  /**
   * 从实例创建上下文
   */
  private async createContextFromInstance(instance: BrowserInstance): Promise<BrowserContext> {
    instance.pageCount++;
    instance.lastUsedAt = Date.now();

    // 创建独立的浏览器上下文
    const context = await instance.browser.newContext({
      // 禁用 JavaScript 错误弹窗
      javaScriptEnabled: true,
      // 忽略 HTTPS 错误
      ignoreHTTPSErrors: true,
      // 默认视口
      viewport: { width: DEFAULT_VIEWPORT_WIDTH, height: DEFAULT_VIEWPORT_HEIGHT },
    });

    return context;
  }

  /**
   * 查找可用的浏览器实例
   */
  private findAvailableInstance(): BrowserInstance | null {
    // 按页面数量排序，优先使用负载低的实例
    const availableInstances = this.instances
      .filter((i) => i.isHealthy && i.pageCount < MAX_PAGES_PER_BROWSER)
      .sort((a, b) => a.pageCount - b.pageCount);

    return availableInstances[0] || null;
  }

  /**
   * 等待可用的上下文
   */
  private waitForAvailableContext(): Promise<BrowserContext> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // 从队列中移除
        const index = this.waitingQueue.findIndex((r) => r.timeoutId === timeoutId);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new BrowserUnavailableError(`Timeout waiting for browser (${BROWSER_ACQUIRE_TIMEOUT}ms)`));
      }, BROWSER_ACQUIRE_TIMEOUT);

      this.waitingQueue.push({ resolve, reject, timeoutId });
    });
  }

  /**
   * 处理等待队列
   */
  private async processWaitingQueue(): Promise<void> {
    while (this.waitingQueue.length > 0) {
      const instance = this.findAvailableInstance();
      if (!instance) {
        break;
      }

      const request = this.waitingQueue.shift();
      if (request) {
        clearTimeout(request.timeoutId);
        try {
          const context = await this.createContextFromInstance(instance);
          request.resolve(context);
        } catch (error) {
          request.reject(error as Error);
        }
      }
    }
  }

  /**
   * 处理浏览器断开连接
   */
  private handleBrowserDisconnect(instance: BrowserInstance): void {
    instance.isHealthy = false;

    // 从池中移除
    const index = this.instances.indexOf(instance);
    if (index !== -1) {
      this.instances.splice(index, 1);
      this.logger.debug(`Removed disconnected browser. Pool size: ${this.instances.length}`);
    }

    // 如果有等待的请求，尝试创建新实例
    if (this.waitingQueue.length > 0 && this.instances.length < BROWSER_POOL_SIZE) {
      this.createInstance()
        .then(() => this.processWaitingQueue())
        .catch((err) => this.logger.error('Failed to create replacement browser', err));
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanupTimer(): void {
    // 每分钟检查一次
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleInstances();
    }, 60 * 1000);
  }

  /**
   * 清理空闲实例
   */
  private async cleanupIdleInstances(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const now = Date.now();
    const idleInstances = this.instances.filter(
      (i) => i.pageCount === 0 && now - i.lastUsedAt > BROWSER_IDLE_TIMEOUT,
    );

    // 至少保留一个实例
    const toClose = idleInstances.slice(0, Math.max(0, this.instances.length - 1));

    for (const instance of toClose) {
      await this.closeInstance(instance);
    }

    if (toClose.length > 0) {
      this.logger.debug(`Cleaned up ${toClose.length} idle browser instances`);
    }
  }

  /**
   * 关闭单个实例
   */
  private async closeInstance(instance: BrowserInstance): Promise<void> {
    instance.isHealthy = false;

    // 从池中移除
    const index = this.instances.indexOf(instance);
    if (index !== -1) {
      this.instances.splice(index, 1);
    }

    try {
      await instance.browser.close();
    } catch (error) {
      this.logger.warn(`Error closing browser: ${error}`);
    }
  }

  /**
   * 关闭所有实例
   */
  private async closeAllInstances(): Promise<void> {
    const closePromises = this.instances.map(async (instance) => {
      try {
        await instance.browser.close();
      } catch (error) {
        this.logger.warn(`Error closing browser: ${error}`);
      }
    });

    await Promise.all(closePromises);
    this.instances.length = 0;
    this.logger.log('All browser instances closed');
  }
}
