/**
 * 截图模块
 *
 * 依赖 BrowserModule 提供浏览器实例池
 */

import { Module } from '@nestjs/common';
import { ScreenshotController } from './screenshot.controller';
import { ScreenshotConsoleController } from './screenshot-console.controller';
import { ScreenshotService } from './screenshot.service';
import { ScreenshotRepository } from './screenshot.repository';
import { ScreenshotProcessor } from './screenshot.processor';
import { UrlValidator } from './url-validator';
import { PageRenderer } from './page-renderer';
import { ImageProcessor } from './image-processor';
import { ApiKeyModule } from '../api-key/api-key.module';
import { QuotaModule } from '../quota/quota.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    ApiKeyModule,
    QuotaModule,
    StorageModule,
    QueueModule,
    // BrowserModule 是全局模块，无需显式导入
  ],
  controllers: [ScreenshotController, ScreenshotConsoleController],
  providers: [
    ScreenshotService,
    ScreenshotRepository,
    ScreenshotProcessor,
    UrlValidator,
    PageRenderer,
    ImageProcessor,
  ],
  exports: [ScreenshotService, UrlValidator, PageRenderer, ImageProcessor],
})
export class ScreenshotModule {}
