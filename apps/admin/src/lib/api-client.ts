/**
 * API 客户端
 * 使用 Bearer Token 认证，统一错误处理
 */
import { useAuthStore, getAuthToken } from '@/stores/auth';

// 开发环境使用空字符串走 Vite 代理，生产环境使用完整 URL
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * API 错误类
 */
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
  code?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // 401 或 403 自动登出
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().logout();
        throw new ApiError(
          response.status,
          response.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
          response.status === 401 ? '登录已过期，请重新登录' : '没有权限访问',
        );
      }

      const errorData: ApiErrorResponse = await response.json().catch(() => ({}));

      throw new ApiError(
        response.status,
        errorData.code || errorData.error || 'UNKNOWN_ERROR',
        errorData.message || `请求失败 (${response.status})`,
      );
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    return response.json();
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    return this.handleResponse<T>(response);
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
