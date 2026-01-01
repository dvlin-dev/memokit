import { z } from 'zod'

/**
 * Demo screenshot request DTO
 * 简化版本，仅支持 URL 输入 + 强制验证码
 */
export const demoScreenshotSchema = z.object({
  url: z.string().url('Invalid URL format'),
  captcha: z.string().min(1, 'Captcha token is required'),
})

export type DemoScreenshotDto = z.infer<typeof demoScreenshotSchema>

/**
 * Demo screenshot response DTO
 */
export interface DemoScreenshotResponse {
  success: boolean
  /** Base64 data URL for the screenshot image */
  imageDataUrl?: string
  processingMs?: number
  fileSize?: number
  width?: number
  height?: number
  error?: {
    code: string
    message: string
  }
}
