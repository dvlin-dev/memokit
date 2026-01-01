/**
 * 截图响应 DTO
 */

/** 页面元信息 */
export interface PageMetaDto {
  title?: string;
  description?: string;
  favicon?: string;
}

/** 截图数据 */
export interface ScreenshotDataDto {
  /** 截图 ID */
  id: string;
  /** 截图 URL（CDN 地址或 base64） */
  url: string;
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** 图片格式 */
  format: string;
  /** 文件大小 (bytes) */
  fileSize: number;
  /** 是否来自缓存 */
  fromCache: boolean;
  /** 处理耗时 (ms) */
  processingMs: number;
  /** 页面元信息 */
  meta?: PageMetaDto;
}

/** 截图成功响应 */
export interface ScreenshotSuccessResponseDto {
  success: true;
  data: ScreenshotDataDto;
}

/** 截图错误响应 */
export interface ScreenshotErrorResponseDto {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** 截图响应（联合类型） */
export type ScreenshotResponseDto = ScreenshotSuccessResponseDto | ScreenshotErrorResponseDto;
