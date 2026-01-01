/**
 * [DEFINES]: 截图模块类型定义
 * [USED_BY]: screenshot.service.ts, screenshot.processor.ts, screenshot.controller.ts
 * [POS]: 截图模块核心类型，定义截图请求和响应结构
 */

import type { QuotaSource } from '../../generated/prisma/client';
import type { SubscriptionTier } from '../types/tier.types';

// ============ 设备预设 ============

export type DevicePreset = 'desktop' | 'tablet' | 'mobile';

export const DEVICE_PRESETS: Record<DevicePreset, { width: number; height: number; userAgent?: string }> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
};

// ============ 输出格式 ============

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export type ResponseType = 'url' | 'base64';

// ============ 渲染模式 ============

export type RenderMode = 'fast' | 'complete';

// ============ 截图请求选项 ============

/** 截图请求参数（内部使用，已验证） */
export interface ScreenshotOptions {
  // 必填
  url: string;

  // 视口尺寸
  width: number;
  height: number;
  fullPage: boolean;
  device?: DevicePreset;

  // 输出格式
  format: ImageFormat;
  quality: number;

  // 渲染控制
  renderMode: RenderMode;
  delay: number;
  waitFor?: string;
  clip?: string;
  hide?: string[];

  // 浏览器设置
  darkMode: boolean;
  userAgent?: string;

  // 高级功能
  scripts?: string;

  // 响应控制
  response: ResponseType;
  sync: boolean;
  timeout: number;

  // 可选：返回详细时间统计
  includeTimings?: boolean;
}

// ============ 截图结果 ============

/** 页面元信息 */
export interface PageMeta {
  title?: string;
  description?: string;
  favicon?: string;
}

/** 时间统计 */
export interface ScreenshotTimings {
  /** 队列等待时间 */
  queueWaitMs?: number;
  /** 页面加载时间 */
  pageLoadMs?: number;
  /** 截图捕获时间 */
  captureMs?: number;
  /** 图片处理时间 */
  imageProcessMs?: number;
  /** 文件上传时间 */
  uploadMs?: number;
  /** 总处理时间 */
  totalMs: number;
}

/** 截图响应数据 */
export interface ScreenshotResponseData {
  id: string;
  url: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  fromCache: boolean;
  processingMs: number;
  meta?: PageMeta;
  timings?: ScreenshotTimings;
}

/** 截图响应（API 返回） */
export interface ScreenshotResponse {
  success: true;
  data: ScreenshotResponseData;
}

// ============ 缓存数据 ============

/** 截图缓存数据 */
export interface ScreenshotCacheData {
  screenshotId: string;
  fileUrl: string;
  fileSize: number;
  width: number;
  height: number;
  format: ImageFormat;
  meta: PageMeta;
  processingMs: number;
  createdAt: string;
}

// ============ 任务数据 ============

/** BullMQ 任务数据（重新定义，包含完整信息） */
export interface ScreenshotJobData {
  screenshotId: string;
  userId: string;
  apiKeyId: string | null;
  url: string;
  requestHash: string;
  options: ScreenshotOptions;
  quotaSource: QuotaSource;
  tier: SubscriptionTier;
}

// ============ Service 层类型 ============

/** 截图请求上下文 */
export interface RequestContext {
  userId: string;
  apiKeyId: string | null;
  tier: SubscriptionTier;
  options: ScreenshotOptions;
}

// ============ 渲染器类型 ============

/** 渲染时间统计 */
export interface RenderTimings {
  /** 页面加载时间 (goto + 视觉资源等待) */
  pageLoadMs: number;
  /** 截图捕获时间 */
  captureMs: number;
}

/** 页面渲染结果 */
export interface RenderResult {
  /** 截图 Buffer */
  buffer: Buffer;
  /** 实际宽度 */
  width: number;
  /** 实际高度 */
  height: number;
  /** 页面元信息 */
  meta: PageMeta;
  /** 时间统计 */
  timings: RenderTimings;
}

// ============ 图片处理器类型 ============

/** 图片处理选项 */
export interface ProcessOptions {
  /** 输出格式 */
  format: ImageFormat;
  /** 质量（1-100，仅 jpeg/webp） */
  quality: number;
  /** 是否添加水印 */
  addWatermark: boolean;
}

/** 图片处理结果 */
export interface ProcessResult {
  /** 处理后的 Buffer */
  buffer: Buffer;
  /** 文件大小 */
  fileSize: number;
  /** 实际宽度 */
  width: number;
  /** 实际高度 */
  height: number;
  /** 处理耗时 (ms) */
  processingMs: number;
}

