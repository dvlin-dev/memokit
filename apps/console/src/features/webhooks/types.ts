/**
 * Webhooks 类型定义
 */

/** API 响应包装 */
export interface ApiResponse<T> {
  success: boolean
  data: T
}

/** Webhook 事件类型 */
export type WebhookEvent = 'memory.created' | 'memory.updated' | 'memory.deleted'

/** Webhook 列表项 */
export interface Webhook {
  id: string
  name: string
  url: string
  secretPreview: string
  events: WebhookEvent[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** 创建 Webhook 请求 */
export interface CreateWebhookRequest {
  name: string
  url: string
  events?: WebhookEvent[]
}

/** 更新 Webhook 请求 */
export interface UpdateWebhookRequest {
  name?: string
  url?: string
  events?: WebhookEvent[]
  isActive?: boolean
}
