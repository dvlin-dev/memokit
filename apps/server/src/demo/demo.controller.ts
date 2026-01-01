import {
  Controller,
  Post,
  Body,
  Ip,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { Public } from '../auth/decorators'
import { DemoService } from './demo.service'
import { demoScreenshotSchema, type DemoScreenshotResponse } from './demo.dto'

/**
 * Demo 控制器
 * 提供官网 Playground 的演示 API
 */
@Controller('api/demo')
@Public()
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  /**
   * 执行演示截图
   */
  @Post('screenshot')
  @HttpCode(HttpStatus.OK)
  async screenshot(
    @Body() body: unknown,
    @Ip() fallbackIp: string,
    @Headers('cf-connecting-ip') cfIp?: string,
    @Headers('x-real-ip') realIp?: string,
    @Headers('x-forwarded-for') forwardedFor?: string
  ): Promise<DemoScreenshotResponse> {
    // 1. 验证请求体
    const parseResult = demoScreenshotSchema.safeParse(body)
    if (!parseResult.success) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: parseResult.error.issues[0]?.message || 'Invalid request',
      })
    }

    const { url, captcha } = parseResult.data

    // 2. IP 限流检查
    // 优先级：CF-Connecting-IP > X-Real-IP > X-Forwarded-For > fallback
    const clientIp =
      cfIp?.trim() ||
      realIp?.trim() ||
      forwardedFor?.split(',')[0]?.trim() ||
      fallbackIp
    const ipAllowed = await this.demoService.checkIpRateLimit(clientIp)
    if (!ipAllowed) {
      throw new BadRequestException({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a moment and try again.',
      })
    }

    // 3. 验证码校验
    const valid = await this.demoService.verifyCaptcha(captcha)
    if (!valid) {
      throw new BadRequestException({
        code: 'CAPTCHA_INVALID',
        message: 'Captcha verification failed',
      })
    }

    // 4. 执行截图
    const result = await this.demoService.captureScreenshot(url)

    if (!result.success) {
      throw new BadRequestException(result.error)
    }

    // 5. 记录小时计数（用于数据统计）
    await this.demoService.incrementHourlyCount()

    return result
  }
}
