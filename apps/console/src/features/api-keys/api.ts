/**
 * API Keys API
 */
import { apiClient } from '@/lib/api-client'
import type {
  ApiKey,
  ApiResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
} from './types'

const API_PATH = '/api/console/api-keys'

/** 获取 API Key 列表 */
export async function getApiKeys(): Promise<ApiKey[]> {
  const response = await apiClient.get<ApiResponse<ApiKey[]>>(API_PATH)
  return response.data
}

/** 获取单个 API Key */
export async function getApiKey(id: string): Promise<ApiKey> {
  const response = await apiClient.get<ApiResponse<ApiKey>>(`${API_PATH}/${id}`)
  return response.data
}

/** 创建 API Key */
export async function createApiKey(
  data: CreateApiKeyRequest
): Promise<CreateApiKeyResponse> {
  const response = await apiClient.post<ApiResponse<CreateApiKeyResponse>>(
    API_PATH,
    data
  )
  return response.data
}

/** 更新 API Key */
export async function updateApiKey(
  id: string,
  data: UpdateApiKeyRequest
): Promise<ApiKey> {
  const response = await apiClient.patch<ApiResponse<ApiKey>>(
    `${API_PATH}/${id}`,
    data
  )
  return response.data
}

/** 删除 API Key */
export async function deleteApiKey(id: string): Promise<void> {
  await apiClient.delete(`${API_PATH}/${id}`)
}
