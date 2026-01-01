/**
 * Subscriptions API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  ApiResponse,
  PaginatedResponse,
  SubscriptionListItem,
  SubscriptionDetail,
  SubscriptionQuery,
  UpdateSubscriptionRequest,
} from './types';

/** 构建查询字符串 */
function buildQueryString(query: SubscriptionQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.tier) params.set('tier', query.tier);
  if (query.status) params.set('status', query.status);
  return params.toString();
}

/** 获取订阅列表 */
export async function getSubscriptions(
  query: SubscriptionQuery = {},
): Promise<PaginatedResponse<SubscriptionListItem>> {
  const qs = buildQueryString(query);
  const url = qs ? `${ADMIN_API.SUBSCRIPTIONS}?${qs}` : ADMIN_API.SUBSCRIPTIONS;
  const response = await apiClient.get<
    ApiResponse<PaginatedResponse<SubscriptionListItem>>
  >(url);
  return response.data;
}

/** 获取单个订阅 */
export async function getSubscription(id: string): Promise<SubscriptionDetail> {
  const response = await apiClient.get<ApiResponse<SubscriptionDetail>>(
    `${ADMIN_API.SUBSCRIPTIONS}/${id}`,
  );
  return response.data;
}

/** 更新订阅 */
export async function updateSubscription(
  id: string,
  data: UpdateSubscriptionRequest,
): Promise<SubscriptionListItem> {
  const response = await apiClient.patch<ApiResponse<SubscriptionListItem>>(
    `${ADMIN_API.SUBSCRIPTIONS}/${id}`,
    data,
  );
  return response.data;
}
