/**
 * Entities API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { Entity, ApiResponse, ListEntitiesParams } from './types'

/** 获取 Entity 列表 */
export async function getEntities(
  params: ListEntitiesParams = {}
): Promise<{ entities: Entity[]; total: number }> {
  const searchParams = new URLSearchParams()

  if (params.type) searchParams.set('type', params.type)
  if (params.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId)
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  const url = query ? `${CONSOLE_API.ENTITIES}?${query}` : CONSOLE_API.ENTITIES

  const response = await apiClient.get<ApiResponse<Entity[]>>(url)

  return {
    entities: response.data,
    total: response.meta?.total ?? response.data.length,
  }
}

/** 获取所有 Entity 类型 */
export async function getEntityTypes(): Promise<string[]> {
  const response = await apiClient.get<ApiResponse<string[]>>(
    `${CONSOLE_API.ENTITIES}/types`
  )
  return response.data
}

/** 删除 Entity */
export async function deleteEntity(id: string): Promise<void> {
  await apiClient.delete(`${CONSOLE_API.ENTITIES}/${id}`)
}
