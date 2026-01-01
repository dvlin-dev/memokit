/**
 * [DEFINES]: 截图模块自定义错误类
 * [USED_BY]: screenshot.service.ts, screenshot.processor.ts, url-validator.ts
 * [POS]: 错误边界，提供清晰的错误类型和错误码
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/** 截图错误码 */
export enum ScreenshotErrorCode {
  // 客户端错误
  INVALID_URL = 'INVALID_URL',
  INVALID_PARAMS = 'INVALID_PARAMS',
  URL_NOT_ALLOWED = 'URL_NOT_ALLOWED',
  FEATURE_NOT_ALLOWED = 'FEATURE_NOT_ALLOWED',

  // 截图执行错误
  PAGE_LOAD_FAILED = 'PAGE_LOAD_FAILED',
  PAGE_TIMEOUT = 'PAGE_TIMEOUT',
  SELECTOR_NOT_FOUND = 'SELECTOR_NOT_FOUND',
  SCREENSHOT_FAILED = 'SCREENSHOT_FAILED',

  // 资源错误
  BROWSER_UNAVAILABLE = 'BROWSER_UNAVAILABLE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  // 服务端错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/** 截图错误基类 */
export abstract class ScreenshotError extends HttpException {
  constructor(
    public readonly code: ScreenshotErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          details,
        },
      },
      status,
    );
  }
}

/** URL 无效错误 */
export class InvalidUrlError extends ScreenshotError {
  constructor(url: string, reason: string) {
    super(
      ScreenshotErrorCode.INVALID_URL,
      `Invalid URL: ${reason}`,
      HttpStatus.BAD_REQUEST,
      { url, reason },
    );
  }
}

/** 参数无效错误 */
export class InvalidParamsError extends ScreenshotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      ScreenshotErrorCode.INVALID_PARAMS,
      message,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }
}

/** URL 不允许错误（SSRF 防护） */
export class UrlNotAllowedError extends ScreenshotError {
  constructor(url: string, reason: string) {
    super(
      ScreenshotErrorCode.URL_NOT_ALLOWED,
      `URL not allowed: ${reason}`,
      HttpStatus.FORBIDDEN,
      { url, reason },
    );
  }
}

/** 功能不允许错误 */
export class FeatureNotAllowedError extends ScreenshotError {
  constructor(feature: string, tier: string) {
    super(
      ScreenshotErrorCode.FEATURE_NOT_ALLOWED,
      `Feature "${feature}" is not available for ${tier} tier`,
      HttpStatus.FORBIDDEN,
      { feature, tier },
    );
  }
}

/** 页面加载失败错误 */
export class PageLoadFailedError extends ScreenshotError {
  constructor(url: string, reason: string) {
    super(
      ScreenshotErrorCode.PAGE_LOAD_FAILED,
      `Failed to load page: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      { url, reason },
    );
  }
}

/** 页面超时错误 */
export class PageTimeoutError extends ScreenshotError {
  constructor(url: string, timeout: number) {
    super(
      ScreenshotErrorCode.PAGE_TIMEOUT,
      `Page load timeout after ${timeout}ms`,
      HttpStatus.GATEWAY_TIMEOUT,
      { url, timeout },
    );
  }
}

/** 选择器未找到错误 */
export class SelectorNotFoundError extends ScreenshotError {
  constructor(selector: string, type: 'waitFor' | 'clip') {
    super(
      ScreenshotErrorCode.SELECTOR_NOT_FOUND,
      `Selector "${selector}" not found (${type})`,
      HttpStatus.BAD_REQUEST,
      { selector, type },
    );
  }
}

/** 截图执行失败错误 */
export class ScreenshotFailedError extends ScreenshotError {
  constructor(reason: string) {
    super(
      ScreenshotErrorCode.SCREENSHOT_FAILED,
      `Screenshot failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { reason },
    );
  }
}

/** 浏览器不可用错误 */
export class BrowserUnavailableError extends ScreenshotError {
  constructor(reason: string) {
    super(
      ScreenshotErrorCode.BROWSER_UNAVAILABLE,
      `Browser unavailable: ${reason}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { reason },
    );
  }
}

/** 上传失败错误 */
export class UploadFailedError extends ScreenshotError {
  constructor(reason: string) {
    super(
      ScreenshotErrorCode.UPLOAD_FAILED,
      `Failed to upload screenshot: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { reason },
    );
  }
}

/** 内部错误 */
export class InternalError extends ScreenshotError {
  constructor(message: string) {
    super(
      ScreenshotErrorCode.INTERNAL_ERROR,
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/** 判断是否为截图错误 */
export function isScreenshotError(error: unknown): error is ScreenshotError {
  return error instanceof ScreenshotError;
}

/** 从错误中提取错误消息 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}
