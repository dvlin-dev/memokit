export interface CaptureResult {
  imageUrl: string
  captureTime: number
  imageSize: number
  dimensions: {
    width: number
    height: number
  }
}

interface BackendResponse {
  success: boolean
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

class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** API 基础地址（生产环境使用环境变量，开发环境使用代理） */
const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * 执行截图
 */
export async function captureScreenshot(
  url: string,
  captcha: string
): Promise<CaptureResult> {
  const response = await fetch(`${API_BASE}/api/demo/screenshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, captcha }),
  })

  const data: BackendResponse = await response.json()

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.message || 'Failed to capture screenshot',
      data.error?.code
    )
  }

  if (!data.imageDataUrl) {
    throw new ApiError('No screenshot data returned')
  }

  return {
    imageUrl: data.imageDataUrl,
    captureTime: data.processingMs || 0,
    imageSize: data.fileSize || 0,
    dimensions: {
      width: data.width || 0,
      height: data.height || 0,
    },
  }
}
