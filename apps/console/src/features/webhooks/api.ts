/**
 * Webhooks API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { Webhook, ApiResponse, CreateWebhookRequest, UpdateWebhookRequest } from './types'

/** 获取 Webhook 列表 */
export async function getWebhooks(): Promise<Webhook[]> {
  const response = await apiClient.get<ApiResponse<Webhook[]>>(CONSOLE_API.WEBHOOKS)
  return response.data
}

/** 创建 Webhook */
export async function createWebhook(data: CreateWebhookRequest): Promise<Webhook> {
  const response = await apiClient.post<ApiResponse<Webhook>>(CONSOLE_API.WEBHOOKS, data)
  return response.data
}

/** 更新 Webhook */
export async function updateWebhook(
  id: string,
  data: UpdateWebhookRequest
): Promise<Webhook> {
  const response = await apiClient.patch<ApiResponse<Webhook>>(
    `${CONSOLE_API.WEBHOOKS}/${id}`,
    data
  )
  return response.data
}

/** 删除 Webhook */
export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete(`${CONSOLE_API.WEBHOOKS}/${id}`)
}

/** 重新生成 Secret */
export async function regenerateWebhookSecret(id: string): Promise<Webhook> {
  const response = await apiClient.post<ApiResponse<Webhook>>(
    `${CONSOLE_API.WEBHOOKS}/${id}/regenerate-secret`
  )
  return response.data
}
