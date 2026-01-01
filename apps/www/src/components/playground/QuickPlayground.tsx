import { useState, useCallback, useRef } from 'react'
import { UrlInput } from './UrlInput'
import { PresetButtons } from './PresetButtons'
import { ResultPreview } from './ResultPreview'
import { StatsBar } from './StatsBar'
import { Turnstile, type TurnstileRef } from './Turnstile'
import { captureScreenshot, type CaptureResult } from '@/lib/api'

/** Turnstile Site Key（从环境变量读取） */
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined

export function QuickPlayground() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CaptureResult | null>(null)

  // Turnstile ref 和 token 状态
  const turnstileRef = useRef<TurnstileRef>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const executeCapture = useCallback(async (url: string, token: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await captureScreenshot(url, token)
      setResult(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to capture screenshot'
      )
      setResult(null)
    } finally {
      setIsLoading(false)
      // 截图完成后（无论成功或失败）重置 Turnstile 以获取新 token
      // 对于已验证的用户，通常会静默完成，无需再次点击
      setCaptchaToken(null)
      turnstileRef.current?.reset()
    }
  }, [])

  const handleCapture = useCallback(
    (url: string) => {
      if (!TURNSTILE_SITE_KEY) {
        setError('Captcha not configured')
        return
      }

      if (!captchaToken) {
        // 按钮已禁用，正常情况下不会执行到这里
        return
      }

      executeCapture(url, captchaToken)
    },
    [captchaToken, executeCapture]
  )

  const handleCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token)
  }, [])

  const handleCaptchaError = useCallback(() => {
    setError('Captcha verification failed')
    setCaptchaToken(null)
  }, [])

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null)
  }, [])

  const canSubmit = !!captchaToken && !isLoading

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* URL Input */}
      <UrlInput
        onSubmit={handleCapture}
        isLoading={isLoading}
        disabled={!canSubmit}
      />

      {/* Preset Buttons */}
      <PresetButtons
        onSelect={handleCapture}
        isLoading={isLoading}
        disabled={!canSubmit}
      />

      {/* Turnstile 验证 */}
      {TURNSTILE_SITE_KEY && (
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={handleCaptchaSuccess}
          onError={handleCaptchaError}
          onExpire={handleCaptchaExpire}
        />
      )}

      {/* 验证状态提示 */}
      {TURNSTILE_SITE_KEY && (
        <div className="text-center text-sm">
          {captchaToken ? (
            <span className="text-green-600">Verified - Ready to capture</span>
          ) : (
            <span className="text-gray-500">
              Complete the verification above to enable screenshot
            </span>
          )}
        </div>
      )}

      {/* Stats Bar */}
      <StatsBar
        captureTime={result?.captureTime ?? null}
        imageSize={result?.imageSize ?? null}
        dimensions={result?.dimensions ?? null}
      />

      {/* Result Preview */}
      <ResultPreview
        isLoading={isLoading}
        error={error}
        imageUrl={result?.imageUrl ?? null}
      />
    </div>
  )
}
