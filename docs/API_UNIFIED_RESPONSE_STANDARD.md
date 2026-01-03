# 前后端 API 统一响应规范

本文档介绍项目中前后端 API 接口返回值和解析的统一规范实现方式，可供其他项目参考。

---

## 一、核心设计理念

1. **后端 Controller 只返回业务数据**，响应拦截器负责统一封装
2. **前端 API Client 自动解包响应**，业务代码直接使用数据
3. **共享类型定义**，前后端使用相同的响应格式类型
4. **统一分页模式**（offset-based）
5. **统一错误格式**，包含错误码和详细信息

---

## 二、统一响应格式

### 2.1 成功响应

```typescript
// 标准响应
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;  // ISO 8601 格式
}

// 分页响应
interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;     // 总数
    limit: number;     // 每页数量
    offset: number;    // 偏移量
    hasMore: boolean;  // 是否还有更多
  };
  timestamp: string;
}
```

### 2.2 错误响应

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;       // 错误码，如 'VALIDATION_ERROR'、'UNAUTHORIZED'
    message: string;    // 用户可读消息
    details?: unknown;  // 可选的详细信息
  };
  timestamp: string;
}
```

### 2.3 响应示例

**成功响应：**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "example"
  },
  "timestamp": "2024-01-15T08:30:00.000Z"
}
```

**分页响应：**
```json
{
  "success": true,
  "data": [
    { "id": "1", "name": "item1" },
    { "id": "2", "name": "item2" }
  ],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "timestamp": "2024-01-15T08:30:00.000Z"
}
```

**错误响应：**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": ["Email is required", "Password must be at least 8 characters"]
  },
  "timestamp": "2024-01-15T08:30:00.000Z"
}
```

---

## 三、后端实现（NestJS）

### 3.1 全局配置（main.ts）

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,  // 保留原始请求体用于 Webhook 签名验证
  });

  // 全局 API 前缀配置
  // 排除 health 和 webhooks 路由，它们不需要 /api 前缀
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'webhooks/(.*)'],
  });

  // URI 版本控制
  // Public API 使用 v1 版本，Console/Admin API 使用 VERSION_NEUTRAL
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 全局响应拦截器 - 统一响应格式
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  // 全局异常过滤器 - 统一错误格式
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}
```

### 3.2 响应拦截器（自动包装）

**文件：** `src/common/interceptors/response.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const SKIP_RESPONSE_WRAP = 'skipResponseWrap';

interface PaginatedData {
  items: unknown[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

function isPaginatedData(data: unknown): data is PaginatedData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'items' in data &&
    'pagination' in data &&
    Array.isArray((data as PaginatedData).items)
  );
}

function hasSuccessField(data: unknown): boolean {
  return data !== null && typeof data === 'object' && 'success' in data;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 检查是否需要跳过包装
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAP, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // 204 No Content - 返回 undefined
        if (response.statusCode === 204) {
          return undefined;
        }

        // 已经是标准格式 - 跳过避免双重包装
        if (hasSuccessField(data)) {
          return data;
        }

        const timestamp = new Date().toISOString();

        // 分页响应: { items, pagination } -> { success, data, meta, timestamp }
        if (isPaginatedData(data)) {
          const { items, pagination } = data;
          return {
            success: true,
            data: items,
            meta: {
              total: pagination.total,
              limit: pagination.limit,
              offset: pagination.offset,
              hasMore: pagination.offset + items.length < pagination.total,
            },
            timestamp,
          };
        }

        // 标准响应: data -> { success, data, timestamp }
        return {
          success: true,
          data,
          timestamp,
        };
      }),
    );
  }
}
```

### 3.3 异常过滤器（统一错误处理）

**文件：** `src/common/filters/http-exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const HTTP_STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        // 处理 NestJS 验证管道错误
        if (Array.isArray(obj.message)) {
          message = obj.message[0];
          details = obj.message;
        } else {
          message = (obj.message as string) || exception.message;
          details = obj.details;
        }
      }

      code = HTTP_STATUS_CODES[status] || 'UNKNOWN_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `[${request.method} ${request.url}] Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse: { code: string; message: string; details?: unknown } = {
      code,
      message,
    };

    if (details !== undefined) {
      errorResponse.details = details;
    }

    response.status(status).json({
      success: false,
      error: errorResponse,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 3.4 跳过包装的装饰器

**文件：** `src/common/decorators/response.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { SKIP_RESPONSE_WRAP } from '../interceptors/response.interceptor';

/**
 * 跳过响应包装
 * 用于 Health、Webhook、SSE、文件下载等特殊场景
 */
export const SkipResponseWrap = () => SetMetadata(SKIP_RESPONSE_WRAP, true);
```

### 3.5 Controller 示例

**普通 Controller（自动包装）：**

```typescript
@Controller({ path: 'users', version: '1' })
export class UserController {
  @Get(':id')
  async getUser(@Param('id') id: string) {
    // 只返回业务数据，拦截器会自动包装成 { success: true, data, timestamp }
    return this.userService.findById(id);
  }

  @Get()
  async list(@Query('limit') limit = 20, @Query('offset') offset = 0) {
    // 返回分页格式，拦截器会自动转换
    const [items, total] = await this.userService.findAll(limit, offset);
    return {
      items,
      pagination: { total, limit, offset },
    };
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    await this.userService.delete(id);
    // 返回 void，拦截器会返回 204 No Content
  }
}
```

**跳过包装的 Controller：**

```typescript
@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipResponseWrap()  // 跳过响应包装
export class HealthController {
  @Get()
  async check() {
    // 直接返回，不会被包装
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

---

## 四、前端实现（React + Fetch）

### 4.1 共享类型定义

**文件：** `packages/shared-types/src/api.ts`

```typescript
// 统一 API 响应格式
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

### 4.2 API Client（自动解包）

**文件：** `src/lib/api-client.ts`

```typescript
import { useAuthStore, getAuthToken } from '../stores/auth';
import type { PaginationMeta, ApiErrorResponse } from '@your-package/shared-types';

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

/** 分页结果 */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 处理响应 - 自动解包 data 字段
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // 处理 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // 处理非 JSON 响应
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(response.status, 'NETWORK_ERROR', 'Request failed');
      }
      return {} as T;
    }

    const json = await response.json();

    // 处理错误响应
    if (!response.ok || json.success === false) {
      // 401/403 自动登出
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().logout();
      }

      const errorResponse = json as ApiErrorResponse;
      throw new ApiError(
        response.status,
        errorResponse.error?.code || 'UNKNOWN_ERROR',
        errorResponse.error?.message || `Request failed (${response.status})`
      );
    }

    // 成功响应 - 返回 data 字段（自动解包）
    return json.data;
  }

  /**
   * 发送请求
   */
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

  // HTTP 方法
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

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * GET 分页请求 - 返回 data + meta
   */
  async getPaginated<T>(endpoint: string): Promise<PaginatedResult<T>> {
    const token = getAuthToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, { headers });

    if (response.status === 401 || response.status === 403) {
      useAuthStore.getState().logout();
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.success === false) {
      const errorResponse = json as ApiErrorResponse;
      throw new ApiError(
        response.status,
        errorResponse.error?.code || 'UNKNOWN_ERROR',
        errorResponse.error?.message || `Request failed (${response.status})`
      );
    }

    return {
      data: json.data,
      meta: json.meta,
    };
  }

  /**
   * Blob 请求（用于文件下载）
   */
  async getBlob(endpoint: string): Promise<Blob> {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().logout();
      }
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Download failed');
    }

    return response.blob();
  }
}

// 单例实例
export const apiClient = new ApiClient(API_BASE_URL);
```

### 4.3 API 路径常量

**文件：** `src/lib/api-paths.ts`

```typescript
// 认证 API
export const AUTH_API = {
  SIGN_IN: '/api/auth/sign-in/email',
  SIGN_UP: '/api/auth/sign-up/email',
  SIGN_OUT: '/api/auth/sign-out',
  SESSION: '/api/auth/get-session',
};

// 用户 API
export const USER_API = {
  ME: '/api/user/me',
};

// 公开 API（需要 API Key）
export const PUBLIC_API = {
  MEMORIES: '/api/v1/memories',
  ENTITIES: '/api/v1/entities',
  QUOTA: '/api/v1/quota',
};

// 控制台 API（需要登录）
export const CONSOLE_API = {
  API_KEYS: '/api/console/api-keys',
  MEMORIES: '/api/console/memories',
  ENTITIES: '/api/console/entities',
  STATS: '/api/console/stats',
};

// 健康检查（无前缀）
export const HEALTH_API = {
  BASE: '/health',
  LIVE: '/health/live',
  READY: '/health/ready',
};
```

### 4.4 Feature API 使用示例

**文件：** `src/features/users/api.ts`

```typescript
import { apiClient } from '@/lib/api-client';
import type { User } from './types';

const API_PATH = '/api/v1/users';

// GET 单个资源 - 自动解包，直接返回 User
export async function getUser(id: string): Promise<User> {
  return apiClient.get<User>(`${API_PATH}/${id}`);
}

// GET 列表 - 自动解包，直接返回 User[]
export async function getUsers(): Promise<User[]> {
  return apiClient.get<User[]>(API_PATH);
}

// GET 分页列表 - 返回 { data, meta }
export async function getUsersPaginated(limit = 20, offset = 0) {
  return apiClient.getPaginated<User>(`${API_PATH}?limit=${limit}&offset=${offset}`);
}

// POST 创建
export async function createUser(data: CreateUserDto): Promise<User> {
  return apiClient.post<User>(API_PATH, data);
}

// PATCH 更新
export async function updateUser(id: string, data: UpdateUserDto): Promise<User> {
  return apiClient.patch<User>(`${API_PATH}/${id}`, data);
}

// DELETE 删除
export async function deleteUser(id: string): Promise<void> {
  return apiClient.delete<void>(`${API_PATH}/${id}`);
}
```

### 4.5 React Query Hooks 示例

**文件：** `src/features/users/hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getUsers, createUser, deleteUser } from './api';
import type { CreateUserDto } from './types';

const QUERY_KEY = ['users'];

// 查询用户列表
export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getUsers,
  });
}

// 创建用户
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
}

// 删除用户
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
}
```

---

## 五、API 版本控制

### 5.1 路由结构

```
/api                          # Global Prefix
├── /v1                       # Public API (API Key 认证)
│   ├── /memories
│   ├── /entities
│   ├── /relations
│   ├── /quota
│   └── /usage
│
├── /console                  # Console API (Session 认证)
│   ├── /api-keys
│   ├── /entities
│   ├── /memories
│   └── /stats
│
├── /admin                    # Admin API (Admin Session 认证)
│   ├── /dashboard
│   ├── /users
│   └── /orders
│
├── /user                     # User API (Session 认证)
│   └── /me
│
├── /auth                     # Auth API (Public)
│   └── /*
│
/health                       # Health Check (Public, 不加前缀)
/webhooks/creem               # External Webhooks (Public, 不加前缀)
```

### 5.2 Controller 版本配置

**Public API（使用版本号）：**

```typescript
import { Controller, Version } from '@nestjs/common';

@Controller({ path: 'memories', version: '1' })  // -> /api/v1/memories
export class MemoryController { ... }
```

**Console/Admin API（使用 VERSION_NEUTRAL）：**

```typescript
import { Controller, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({ path: 'console/api-keys', version: VERSION_NEUTRAL })  // -> /api/console/api-keys
export class ApiKeyController { ... }
```

---

## 六、特殊响应处理

| 端点 | 格式 | 原因 |
|------|------|------|
| `/health`, `/health/live`, `/health/ready` | 自定义格式 | 监控系统兼容 |
| `/webhooks/*` | 第三方期望格式 | 第三方服务回调 |
| `/api/auth/*` | Better Auth 格式 | 认证库决定 |
| 文件下载 | Binary + Headers | 非 JSON |
| SSE 流 | `data: {...}\n\n` | SSE 规范 |

---

## 七、错误码对照表

| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 400 | `BAD_REQUEST` | 请求参数错误 |
| 401 | `UNAUTHORIZED` | 未认证 |
| 403 | `FORBIDDEN` | 无权限 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 409 | `CONFLICT` | 资源冲突 |
| 422 | `VALIDATION_ERROR` | 验证失败 |
| 429 | `TOO_MANY_REQUESTS` | 请求过于频繁 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

---

## 八、关键文件清单

### 后端（NestJS）

```
apps/server/src/
├── main.ts                                    # 全局配置
├── common/
│   ├── interceptors/
│   │   └── response.interceptor.ts            # 响应拦截器
│   ├── filters/
│   │   └── http-exception.filter.ts           # 异常过滤器
│   └── decorators/
│       └── response.decorator.ts              # @SkipResponseWrap 装饰器
```

### 前端（React）

```
apps/console/src/
├── lib/
│   ├── api-client.ts                          # API 客户端
│   └── api-paths.ts                           # API 路径常量
├── stores/
│   └── auth.ts                                # 认证状态管理
└── features/*/
    ├── api.ts                                 # Feature API 函数
    └── hooks.ts                               # React Query Hooks
```

### 共享类型

```
packages/shared-types/src/
└── api.ts                                     # 统一响应类型定义
```

---

## 九、实现要点总结

### 后端

1. **全局配置**：使用 `setGlobalPrefix` 和 `enableVersioning` 统一路由结构
2. **响应拦截器**：自动将 Controller 返回值包装成统一格式
3. **异常过滤器**：捕获所有异常并转换为统一错误格式
4. **装饰器**：提供 `@SkipResponseWrap` 跳过特殊路由的包装

### 前端

1. **自动解包**：API Client 的 `handleResponse` 自动提取 `data` 字段
2. **错误处理**：统一的 `ApiError` 类，支持错误类型判断
3. **类型安全**：使用共享类型包确保前后端类型一致
4. **分页支持**：专用的 `getPaginated` 方法返回 `{ data, meta }`

### 优势

1. **Controller 代码简洁**：只需返回业务数据，无需手动包装
2. **前端调用简单**：`apiClient.get<User>('/users/1')` 直接返回 `User`
3. **错误处理统一**：所有错误都有统一的 code、message、details
4. **类型安全**：前后端共享类型定义，减少类型不一致问题
5. **可扩展**：通过装饰器可以灵活跳过特殊路由的包装

---

*Created: 2026-01*
