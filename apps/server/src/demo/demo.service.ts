import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { BrowserContext } from 'playwright'
import { RedisService } from '../redis/redis.service'
import { BrowserPool } from '../browser/browser-pool'
import { UrlValidator } from '../screenshot/url-validator'
import { PageRenderer } from '../screenshot/page-renderer'
import { ImageProcessor } from '../screenshot/image-processor'
import type { ScreenshotOptions } from '../screenshot/screenshot.types'
import type { DemoScreenshotResponse } from './demo.dto'

/** 每分钟每 IP 最大请求数 */
const IP_RATE_LIMIT = 10

/** Redis key 前缀 */
const HOURLY_KEY_PREFIX = 'demo:hourly:'

/** Demo 截图默认参数 */
const DEFAULT_OPTIONS: Omit<ScreenshotOptions, 'url'> = {
  width: 1280,
  height: 800,
  format: 'png',
  quality: 80,
  delay: 0,
  timeout: 15000,
  fullPage: false,
  darkMode: false,
  renderMode: 'fast',
  response: 'url',
  sync: true,
}

/**
 * Demo 服务
 * 提供官网 Playground 的截图演示功能
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name)

  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly browserPool: BrowserPool,
    private readonly urlValidator: UrlValidator,
    private readonly pageRenderer: PageRenderer,
    private readonly imageProcessor: ImageProcessor
  ) {}

  /**
   * 获取当前小时的 Redis key（用于数据统计）
   */
  private getHourlyKey(): string {
    const hour = new Date().toISOString().slice(0, 13) // "2026-01-01T14"
    return `${HOURLY_KEY_PREFIX}${hour}`
  }

  /**
   * 获取 IP 限流 key
   */
  private getIpKey(ip: string): string {
    const minute = new Date().toISOString().slice(0, 16) // "2026-01-01T14:30"
    return `demo:ip:${ip}:${minute}`
  }

  /**
   * 检查 IP 限流
   * @returns true 如果允许，false 如果超限
   */
  async checkIpRateLimit(ip: string): Promise<boolean> {
    const key = this.getIpKey(ip)
    const countStr = await this.redis.get(key)
    const count = countStr ? parseInt(countStr, 10) : 0

    if (count >= IP_RATE_LIMIT) {
      return false
    }

    await this.redis.incr(key)
    await this.redis.expire(key, 60)
    return true
  }

  /**
   * 增加小时计数（用于数据统计）
   */
  async incrementHourlyCount(): Promise<void> {
    const key = this.getHourlyKey()
    await this.redis.incr(key)
    await this.redis.expire(key, 3600) // 1 小时过期
  }

  /**
   * 验证 Turnstile token
   */
  async verifyCaptcha(token: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY')
    if (!secretKey) {
      this.logger.warn('TURNSTILE_SECRET_KEY not configured, skipping verification')
      return true
    }

    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }),
      })

      const data = await response.json()
      return data.success === true
    } catch (error) {
      this.logger.error('Turnstile verification failed', error)
      return false
    }
  }

  /**
   * 执行演示截图
   */
  async captureScreenshot(url: string): Promise<DemoScreenshotResponse> {
    const startTime = Date.now()
    let context: BrowserContext | null = null

    try {
      // 1. URL 安全验证
      await this.urlValidator.validate(url)

      // 2. 获取浏览器上下文
      context = await this.browserPool.acquireContext()

      // 3. 渲染页面
      const renderResult = await this.pageRenderer.render(context, {
        url,
        ...DEFAULT_OPTIONS,
      })

      // 4. 处理图片
      const imageResult = await this.imageProcessor.process(renderResult.buffer, {
        format: DEFAULT_OPTIONS.format,
        quality: DEFAULT_OPTIONS.quality,
        addWatermark: true,
      })

      // 5. 转换为 base64 data URL
      const base64 = imageResult.buffer.toString('base64')
      const imageDataUrl = `data:image/png;base64,${base64}`

      const processingMs = Date.now() - startTime

      return {
        success: true,
        imageDataUrl,
        processingMs,
        fileSize: imageResult.fileSize,
        width: imageResult.width,
        height: imageResult.height,
      }
    } catch (error) {
      this.logger.error('Demo screenshot failed', error)
      return {
        success: false,
        error: {
          code: 'SCREENSHOT_FAILED',
          message: error instanceof Error ? error.message : 'Screenshot capture failed',
        },
      }
    } finally {
      // 释放浏览器上下文
      if (context) {
        try {
          await context.close()
        } catch (e) {
          this.logger.warn('Failed to close browser context', e)
        }
      }
    }
  }
}
