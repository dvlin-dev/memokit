/**
 * Orders API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  ApiResponse,
  PaginatedResponse,
  OrderListItem,
  OrderDetail,
  OrderQuery,
} from './types';

/** 构建查询字符串 */
function buildQueryString(query: OrderQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.type) params.set('type', query.type);
  return params.toString();
}

/** 获取订单列表 */
export async function getOrders(
  query: OrderQuery = {},
): Promise<PaginatedResponse<OrderListItem>> {
  const qs = buildQueryString(query);
  const url = qs ? `${ADMIN_API.ORDERS}?${qs}` : ADMIN_API.ORDERS;
  const response = await apiClient.get<ApiResponse<PaginatedResponse<OrderListItem>>>(url);
  return response.data;
}

/** 获取单个订单 */
export async function getOrder(id: string): Promise<OrderDetail> {
  const response = await apiClient.get<ApiResponse<OrderDetail>>(
    `${ADMIN_API.ORDERS}/${id}`,
  );
  return response.data;
}
