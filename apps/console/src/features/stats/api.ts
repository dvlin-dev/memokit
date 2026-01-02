/**
 * Stats API
 */
import { CONSOLE_API } from '@/lib/api-paths'
import type { StatsOverview, DailyUsage, MonthlyUsage } from './types'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function getStatsOverview(): Promise<StatsOverview> {
  const res = await fetch(`${CONSOLE_API.STATS}/overview`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch stats overview')
  const json: ApiResponse<StatsOverview> = await res.json()
  return json.data
}

export async function getDailyUsage(days: number = 30): Promise<DailyUsage[]> {
  const res = await fetch(`${CONSOLE_API.STATS}/daily?days=${days}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch daily usage')
  const json: ApiResponse<DailyUsage[]> = await res.json()
  return json.data
}

export async function getUsageHistory(limit: number = 12): Promise<MonthlyUsage[]> {
  const res = await fetch(`${CONSOLE_API.STATS}/history?limit=${limit}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch usage history')
  const json: ApiResponse<MonthlyUsage[]> = await res.json()
  return json.data
}
