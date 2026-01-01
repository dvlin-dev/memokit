/**
 * DTO 转换器
 * 将请求 DTO 转换为内部 Options 类型
 */

import type { ScreenshotRequestDto } from './screenshot-request.dto';
import type { ScreenshotOptions } from '../screenshot.types';

/**
 * 将 ScreenshotRequestDto 转换为 ScreenshotOptions
 */
export function toScreenshotOptions(dto: ScreenshotRequestDto): ScreenshotOptions {
  return {
    url: dto.url,
    width: dto.width,
    height: dto.height,
    fullPage: dto.fullPage,
    device: dto.device,
    format: dto.format,
    quality: dto.quality,
    renderMode: dto.renderMode,
    delay: dto.delay,
    waitFor: dto.waitFor,
    clip: dto.clip,
    hide: dto.hide,
    darkMode: dto.darkMode,
    userAgent: dto.userAgent,
    scripts: dto.scripts,
    response: dto.response,
    sync: dto.sync,
    timeout: dto.timeout,
  };
}
