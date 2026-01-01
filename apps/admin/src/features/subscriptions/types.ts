/**
 * Subscriptions 类型定义
 */
export type { ApiResponse, Pagination, PaginatedResponse } from '@/lib/types';

/** 订阅层级 */
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'TEAM';

/** 订阅状态 */
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED';

/** 订阅列表项 */
export interface SubscriptionListItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 订阅详情 */
export interface SubscriptionDetail extends SubscriptionListItem {
  creemCustomerId: string | null;
  creemSubscriptionId: string | null;
}

/** 订阅查询参数 */
export interface SubscriptionQuery {
  page?: number;
  limit?: number;
  search?: string;
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
}

/** 更新订阅请求 */
export interface UpdateSubscriptionRequest {
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
}
