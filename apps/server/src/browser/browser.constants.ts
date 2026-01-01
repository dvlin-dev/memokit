/**
 * Browser 模块常量配置
 */

import { cpus } from 'os';

/** 浏览器池大小（基于 CPU 核数） */
export const BROWSER_POOL_SIZE = Math.max(2, Math.min(8, cpus().length * 2));

/** 浏览器实例空闲回收时间（ms） */
export const BROWSER_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 分钟

/** 浏览器池获取超时（ms） */
export const BROWSER_ACQUIRE_TIMEOUT = 10000;

/** 单个浏览器最大页面数 */
export const MAX_PAGES_PER_BROWSER = 10;

/** 默认视口宽度 */
export const DEFAULT_VIEWPORT_WIDTH = 1280;

/** 默认视口高度 */
export const DEFAULT_VIEWPORT_HEIGHT = 800;
