import { Module } from '@nestjs/common'
import { DemoController } from './demo.controller'
import { DemoService } from './demo.service'
import { ScreenshotModule } from '../screenshot/screenshot.module'

/**
 * Demo 模块
 * 提供官网 Playground 的演示功能
 */
@Module({
  imports: [ScreenshotModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
