/**
 * Screenshot 模块导出
 */

export { ScreenshotModule } from './screenshot.module';
export { ScreenshotService } from './screenshot.service';
export { ScreenshotRepository } from './screenshot.repository';
export { UrlValidator } from './url-validator';

// Types
export type {
  ScreenshotOptions,
  ScreenshotResponse,
  ScreenshotResponseData,
  ScreenshotCacheData,
  ScreenshotJobData,
  PageMeta,
  DevicePreset,
  ImageFormat,
  ResponseType,
  RequestContext,
  RenderResult,
  ProcessOptions,
  ProcessResult,
} from './screenshot.types';

// Errors
export {
  ScreenshotError,
  ScreenshotErrorCode,
  InvalidUrlError,
  InvalidParamsError,
  UrlNotAllowedError,
  FeatureNotAllowedError,
  PageLoadFailedError,
  PageTimeoutError,
  SelectorNotFoundError,
  ScreenshotFailedError,
  BrowserUnavailableError,
  UploadFailedError,
  InternalError,
  isScreenshotError,
  getErrorMessage,
} from './screenshot.errors';

// DTOs
export { ScreenshotRequestDto } from './dto';
export type {
  ScreenshotDataDto,
  ScreenshotSuccessResponseDto,
  ScreenshotErrorResponseDto,
  ScreenshotResponseDto,
} from './dto';
