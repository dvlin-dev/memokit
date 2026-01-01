/**
 * DTO 导出
 */

export { screenshotRequestSchema, type ScreenshotRequestDto } from './screenshot-request.dto';
export type {
  ScreenshotDataDto,
  ScreenshotSuccessResponseDto,
  ScreenshotErrorResponseDto,
  ScreenshotResponseDto,
  PageMetaDto,
} from './screenshot-response.dto';
export { toScreenshotOptions } from './dto-converter';
