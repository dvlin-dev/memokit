/**
 * Users API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  ApiResponse,
  PaginatedResponse,
  UserListItem,
  UserDetail,
  UserQuery,
  UpdateUserRequest,
} from './types';

/** 构建查询字符串 */
function buildQueryString(query: UserQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.isAdmin !== undefined) params.set('isAdmin', String(query.isAdmin));
  return params.toString();
}

/** 获取用户列表 */
export async function getUsers(
  query: UserQuery = {},
): Promise<PaginatedResponse<UserListItem>> {
  const qs = buildQueryString(query);
  const url = qs ? `${ADMIN_API.USERS}?${qs}` : ADMIN_API.USERS;
  const response = await apiClient.get<ApiResponse<PaginatedResponse<UserListItem>>>(url);
  return response.data;
}

/** 获取单个用户 */
export async function getUser(id: string): Promise<UserDetail> {
  const response = await apiClient.get<ApiResponse<UserDetail>>(
    `${ADMIN_API.USERS}/${id}`,
  );
  return response.data;
}

/** 更新用户 */
export async function updateUser(
  id: string,
  data: UpdateUserRequest,
): Promise<UserListItem> {
  const response = await apiClient.patch<ApiResponse<UserListItem>>(
    `${ADMIN_API.USERS}/${id}`,
    data,
  );
  return response.data;
}

/** 删除用户 */
export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`${ADMIN_API.USERS}/${id}`);
}
