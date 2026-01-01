/**
 * Dashboard API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type { ApiResponse, DashboardStats, ChartData } from './types';

/**
 * 获取仪表盘统计数据
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<ApiResponse<DashboardStats>>(
    ADMIN_API.DASHBOARD
  );
  return response.data;
}

/**
 * 获取图表数据（近 7 天）
 */
export async function getChartData(): Promise<ChartData> {
  const response = await apiClient.get<ApiResponse<ChartData>>(
    `${ADMIN_API.DASHBOARD}/charts`
  );
  return response.data;
}
