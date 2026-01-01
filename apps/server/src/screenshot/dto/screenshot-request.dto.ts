/**
 * 截图请求 DTO - Zod Schema
 */

import { z } from 'zod';
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_FORMAT,
  DEFAULT_QUALITY,
  DEFAULT_DELAY,
  DEFAULT_SYNC_TIMEOUT,
  MAX_DELAY,
  MAX_SYNC_TIMEOUT,
} from '../screenshot.constants';

/** 设备预设 Schema */
const devicePresetSchema = z.enum(['desktop', 'tablet', 'mobile']);

/** 图片格式 Schema */
const imageFormatSchema = z.enum(['png', 'jpeg', 'webp']);

/** 响应类型 Schema */
const responseTypeSchema = z.enum(['url', 'base64']);

/** 渲染模式 Schema */
const renderModeSchema = z.enum(['fast', 'complete']);

/**
 * 截图请求参数 Schema
 */
export const screenshotRequestSchema = z.object({
  /** 目标 URL */
  url: z.string().url('Invalid URL format'),

  /** 视口宽度 */
  width: z
    .number()
    .int('Width must be an integer')
    .min(100, 'Width must be at least 100')
    .max(3840, 'Width cannot exceed 3840')
    .default(DEFAULT_WIDTH),

  /** 视口高度 */
  height: z
    .number()
    .int('Height must be an integer')
    .min(100, 'Height must be at least 100')
    .max(2160, 'Height cannot exceed 2160')
    .default(DEFAULT_HEIGHT),

  /** 全页面截图 */
  fullPage: z.boolean().default(false),

  /** 设备预设 */
  device: devicePresetSchema.optional(),

  /** 输出格式 */
  format: imageFormatSchema.default(DEFAULT_FORMAT),

  /** 图片质量 (1-100) */
  quality: z
    .number()
    .int('Quality must be an integer')
    .min(1, 'Quality must be at least 1')
    .max(100, 'Quality cannot exceed 100')
    .default(DEFAULT_QUALITY),

  /** 额外等待时间 (ms) */
  delay: z
    .number()
    .int('Delay must be an integer')
    .min(0, 'Delay cannot be negative')
    .max(MAX_DELAY, `Delay cannot exceed ${MAX_DELAY}ms`)
    .default(DEFAULT_DELAY),

  /** 等待指定选择器出现 */
  waitFor: z.string().optional(),

  /** 仅截取指定选择器元素 */
  clip: z.string().optional(),

  /** 隐藏指定选择器元素 */
  hide: z.array(z.string()).optional(),

  /** 强制深色模式 */
  darkMode: z.boolean().default(false),

  /** 渲染模式 */
  renderMode: renderModeSchema.default('fast'),

  /** 自定义 User-Agent */
  userAgent: z.string().optional(),

  /** 截图前执行的脚本（需要付费套餐） */
  scripts: z.string().optional(),

  /** 响应类型 */
  response: responseTypeSchema.default('url'),

  /** 同步等待模式 */
  sync: z.boolean().default(true),

  /** 同步等待超时 (ms) */
  timeout: z
    .number()
    .int('Timeout must be an integer')
    .min(1000, 'Timeout must be at least 1000ms')
    .max(MAX_SYNC_TIMEOUT, `Timeout cannot exceed ${MAX_SYNC_TIMEOUT}ms`)
    .default(DEFAULT_SYNC_TIMEOUT),

  /** 是否返回详细时间统计 */
  includeTimings: z.boolean().default(false),
});

/** 截图请求参数类型 */
export type ScreenshotRequestDto = z.infer<typeof screenshotRequestSchema>;
