/**
 * Browser 模块类型定义
 */

import type { Browser, BrowserContext } from 'playwright';

/** 浏览器实例包装 */
export interface BrowserInstance {
  browser: Browser;
  pageCount: number;
  lastUsedAt: number;
  isHealthy: boolean;
}

/** 等待队列项 */
export interface WaitingRequest {
  resolve: (context: BrowserContext) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

/** 浏览器池状态 */
export interface BrowserPoolStatus {
  /** 总实例数 */
  total: number;
  /** 健康实例数 */
  healthy: number;
  /** 当前页面总数 */
  totalPages: number;
  /** 等待队列长度 */
  waitingCount: number;
}
