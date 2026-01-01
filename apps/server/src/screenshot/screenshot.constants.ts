/**
 * [DEFINES]: 截图模块常量配置
 * [USED_BY]: screenshot.service.ts, screenshot.processor.ts, url-validator.ts
 * [POS]: 集中管理截图相关的配置常量
 */

import { createHash } from 'crypto';
import type { ScreenshotOptions, ImageFormat } from './screenshot.types';

// ============ 缓存配置 ============

/** 缓存版本号（变更截图逻辑时更新以失效旧缓存） */
export const CACHE_VERSION = 'v1';

/** 缓存 TTL（秒） */
export const CACHE_TTL_SECONDS = 3600; // 1 小时

/** 缓存 Key 前缀 */
export const CACHE_KEY_PREFIX = 'ss:cache:';

// ============ 超时配置 ============

/** 默认同步等待超时（ms） */
export const DEFAULT_SYNC_TIMEOUT = 30000;

/** 最大同步等待超时（ms） */
export const MAX_SYNC_TIMEOUT = 60000;

/** 页面加载超时（ms） */
export const PAGE_LOAD_TIMEOUT = 30000;

/** 选择器等待超时（ms） */
export const SELECTOR_WAIT_TIMEOUT = 10000;

/** 首屏视觉资源等待超时（ms） */
export const VISUAL_RESOURCES_TIMEOUT = 5000;

/** Loading 检测轮询间隔（ms） */
export const LOADING_CHECK_INTERVAL = 200;

// ============ 渲染模式配置 ============

/** 渲染模式配置 */
export const RENDER_MODE_CONFIG = {
  fast: {
    waitUntil: 'domcontentloaded' as const,
    pageReadyTimeout: 2000,
    domStableThreshold: 300,
  },
  complete: {
    waitUntil: 'networkidle' as const,
    pageReadyTimeout: 5000,
    domStableThreshold: 500,
  },
} as const;

/** Loading 指示器选择器 */
export const LOADING_SELECTORS = [
  '[class*="loading"]',
  '[class*="spinner"]',
  '[class*="skeleton"]',
  '[class*="loader"]',
  '[aria-busy="true"]',
  '[data-loading="true"]',
  '.ant-spin-spinning',
  '.el-loading-mask',
  '.v-skeleton-loader',
  'svg[class*="spin"]',
] as const;

// ============ 默认值 ============

/** 默认视口宽度 */
export const DEFAULT_WIDTH = 1280;

/** 默认视口高度 */
export const DEFAULT_HEIGHT = 800;

/** 默认输出格式 */
export const DEFAULT_FORMAT: ImageFormat = 'png';

/** 默认图片质量，80 = 轻度压缩（平衡质量和性能） */
export const DEFAULT_QUALITY = 80;

/** 默认延迟（ms） */
export const DEFAULT_DELAY = 0;

/** 最大延迟（ms） */
export const MAX_DELAY = 10000;

// ============ 文件存储 ============

/** 截图文件存储目录（R2） */
export const SCREENSHOT_STORAGE_DIR = 'screenshots';

/** 文件保留天数（按套餐） */
export const FILE_RETENTION_DAYS: Record<string, number> = {
  FREE: 7,
  BASIC: 30,
  PRO: 90,
  TEAM: 365,
};

// ============ 水印配置 ============

/** 免费版水印文本 */
export const FREE_TIER_WATERMARK = 'memory.dev';

/** 水印字体大小 */
export const WATERMARK_FONT_SIZE = 14;

/** 水印边距 */
export const WATERMARK_PADDING = 10;

// ============ 工具函数 ============

/**
 * 生成请求哈希（用于缓存 Key）
 * 仅包含影响截图结果的参数
 */
export function generateRequestHash(options: ScreenshotOptions): string {
  // 规范化 URL（移除尾部斜杠、统一小写 host）
  const normalizedUrl = normalizeUrl(options.url);

  // 构造缓存 Key 对象（仅包含影响渲染结果的参数）
  const cacheKeyObject = {
    url: normalizedUrl,
    width: options.width,
    height: options.height,
    fullPage: options.fullPage,
    format: options.format,
    quality: options.quality,
    device: options.device,
    darkMode: options.darkMode,
    userAgent: options.userAgent,
    clip: options.clip,
    hide: options.hide?.sort(), // 排序以确保一致性
    renderMode: options.renderMode,
  };

  // 生成哈希
  const jsonStr = JSON.stringify(cacheKeyObject);
  const hash = createHash('sha256').update(jsonStr).digest('hex');

  return `${CACHE_VERSION}:${hash}`;
}

/**
 * 规范化 URL
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // 统一小写 host
    parsed.hostname = parsed.hostname.toLowerCase();
    // 移除默认端口
    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = '';
    }
    // 移除尾部斜杠（除了根路径）
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * 生成文件路径（R2 存储）
 * 格式：screenshots/{year}/{month}/{day}/{screenshotId}.{format}
 */
export function generateFilePath(screenshotId: string, format: ImageFormat): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${SCREENSHOT_STORAGE_DIR}/${year}/${month}/${day}/${screenshotId}.${format}`;
}

/**
 * 计算文件过期时间
 */
export function calculateFileExpiresAt(tier: string): Date {
  const days = FILE_RETENTION_DAYS[tier] || FILE_RETENTION_DAYS.FREE;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

/**
 * 获取 Content-Type
 */
export function getContentType(format: ImageFormat): string {
  const contentTypes: Record<ImageFormat, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  };
  return contentTypes[format];
}
