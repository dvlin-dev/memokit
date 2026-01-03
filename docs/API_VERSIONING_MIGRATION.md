# API Versioning Migration Plan

> 使用 NestJS Global Prefix + URI Versioning 统一 API 路由结构

## 目标路由结构

```
/api                          # Global Prefix
├── /v1                       # Public API (API Key 认证)
│   ├── /memories
│   ├── /entities
│   ├── /relations
│   ├── /graph
│   ├── /extract
│   ├── /quota
│   └── /usage
│
├── /console                  # Console API (Session 认证)
│   ├── /api-keys
│   ├── /entities
│   ├── /memories
│   ├── /stats
│   └── /webhooks
│
├── /admin                    # Admin API (Admin Session 认证)
│   ├── /login
│   ├── /logout
│   ├── /dashboard
│   ├── /users
│   ├── /subscriptions
│   └── /orders
│
├── /user                     # User API (Session 认证)
│   └── /me
│
├── /payment                  # Payment API (Session 认证)
│   ├── /subscription
│   └── /quota
│
└── /auth                     # Auth API (Public)
    └── /*

/health                       # Health Check (Public, 不加前缀)
/webhooks/creem               # External Webhooks (Public, 不加前缀)
```

---

## 后端改造清单

### 1. main.ts 配置

**文件**: `apps/server/src/main.ts`

```typescript
import { VersioningType } from '@nestjs/common';

// 添加全局前缀
app.setGlobalPrefix('api', {
  exclude: ['health', 'health/(.*)', 'webhooks/(.*)'],
});

// 启用 URI 版本控制
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

### 2. Controller 改造

#### 2.1 Public API Controllers (需要版本号)

| 文件 | 改造前 | 改造后 |
|------|--------|--------|
| `memory/memory.controller.ts` | `@Controller('v1/memories')` | `@Controller('memories')` + `@Version('1')` |
| `entity/entity.controller.ts` | `@Controller('v1/entities')` | `@Controller('entities')` + `@Version('1')` |
| `relation/relation.controller.ts` | `@Controller('v1/relations')` | `@Controller('relations')` + `@Version('1')` |
| `graph/graph.controller.ts` | `@Controller('v1/graph')` | `@Controller('graph')` + `@Version('1')` |
| `extract/extract.controller.ts` | `@Controller('v1/extract')` | `@Controller('extract')` + `@Version('1')` |
| `quota/quota.controller.ts` | `@Controller('v1/quota')` | `@Controller('quota')` + `@Version('1')` |
| `usage/usage.controller.ts` | `@Controller('v1/usage')` | `@Controller('usage')` + `@Version('1')` |

#### 2.2 Console/Admin/User Controllers (使用 VERSION_NEUTRAL)

| 文件 | 改造前 | 改造后 |
|------|--------|--------|
| `api-key/api-key.controller.ts` | `@Controller('api/console/api-keys')` | `@Controller('console/api-keys')` + `@Version(VERSION_NEUTRAL)` |
| `memory/console-memory.controller.ts` | `@Controller('api/console/memories')` | `@Controller('console/memories')` + `@Version(VERSION_NEUTRAL)` |
| `entity/console-entity.controller.ts` | `@Controller('api/console/entities')` | `@Controller('console/entities')` + `@Version(VERSION_NEUTRAL)` |
| `stats/console-stats.controller.ts` | `@Controller('api/console/stats')` | `@Controller('console/stats')` + `@Version(VERSION_NEUTRAL)` |
| `webhook/webhook.controller.ts` | `@Controller('api/console/webhooks')` | `@Controller('console/webhooks')` + `@Version(VERSION_NEUTRAL)` |
| `user/user.controller.ts` | `@Controller('api/user')` | `@Controller('user')` + `@Version(VERSION_NEUTRAL)` |
| `payment/payment.controller.ts` | `@Controller('api/payment')` | `@Controller('payment')` + `@Version(VERSION_NEUTRAL)` |
| `auth/auth.controller.ts` | `@Controller('api/auth')` | `@Controller('auth')` + `@Version(VERSION_NEUTRAL)` |
| `admin/admin-auth.controller.ts` | `@Controller('api/admin')` | `@Controller('admin')` + `@Version(VERSION_NEUTRAL)` |
| `admin/admin-dashboard.controller.ts` | `@Controller('api/admin/dashboard')` | `@Controller('admin/dashboard')` + `@Version(VERSION_NEUTRAL)` |
| `admin/admin-users.controller.ts` | `@Controller('api/admin/users')` | `@Controller('admin/users')` + `@Version(VERSION_NEUTRAL)` |
| `admin/admin-subscriptions.controller.ts` | `@Controller('api/admin/subscriptions')` | `@Controller('admin/subscriptions')` + `@Version(VERSION_NEUTRAL)` |
| `admin/admin-orders.controller.ts` | `@Controller('api/admin/orders')` | `@Controller('admin/orders')` + `@Version(VERSION_NEUTRAL)` |

#### 2.3 Excluded Controllers (不加前缀)

| 文件 | 保持不变 | 说明 |
|------|----------|------|
| `health/health.controller.ts` | `@Controller('health')` | 通过 exclude 排除 |
| `payment/payment-webhook.controller.ts` | `@Controller('webhooks/creem')` | 通过 exclude 排除 |

### 3. Controller 改造示例

**改造前** (`memory.controller.ts`):
```typescript
import { Controller } from '@nestjs/common';

@Controller('v1/memories')
export class MemoryController { ... }
```

**改造后**:
```typescript
import { Controller, Version } from '@nestjs/common';

@Controller('memories')
@Version('1')
export class MemoryController { ... }
```

**Console Controller 示例**:
```typescript
import { Controller, VERSION_NEUTRAL } from '@nestjs/common';

@Controller('console/api-keys')
@Version(VERSION_NEUTRAL)
export class ApiKeyController { ... }
```

---

## 前端改造清单

### 1. Console App (`apps/console`)

#### 1.1 API Paths 配置

**文件**: `apps/console/src/lib/api-paths.ts`

| 常量 | 改造前 | 改造后 |
|------|--------|--------|
| `AUTH_API.SIGN_IN` | `/api/auth/sign-in/email` | 不变 |
| `AUTH_API.SIGN_UP` | `/api/auth/sign-up/email` | 不变 |
| `AUTH_API.SIGN_OUT` | `/api/auth/sign-out` | 不变 |
| `AUTH_API.SESSION` | `/api/auth/get-session` | 不变 |
| `USER_API.ME` | `/api/user/me` | 不变 |
| `PAYMENT_API.SUBSCRIPTION` | `/api/payment/subscription` | 不变 |
| `PAYMENT_API.QUOTA` | `/api/payment/quota` | 不变 |
| `CONSOLE_API.API_KEYS` | `/api/console/api-keys` | 不变 |
| `CONSOLE_API.WEBHOOKS` | `/api/console/webhooks` | 不变 |
| `CONSOLE_API.ENTITIES` | `/api/console/entities` | 不变 |
| `CONSOLE_API.MEMORIES` | `/api/console/memories` | 不变 |
| `CONSOLE_API.STATS` | `/api/console/stats` | 不变 |
| `PUBLIC_API.MEMORIES` | `/api/v1/memories` | 不变 |
| `PUBLIC_API.ENTITIES` | `/api/v1/entities` | 不变 |
| `PUBLIC_API.QUOTA` | `/api/v1/quota` | 不变 |
| `ADMIN_API.LOGIN` | `/api/admin/login` | 不变 |
| `ADMIN_API.LOGOUT` | `/api/admin/logout` | 不变 |
| `HEALTH_API.BASE` | `/health` | 不变 |

> **注意**: 前端路径已经正确，无需修改！后端改造后路径保持一致。

#### 1.2 Vite Proxy 配置

**文件**: `apps/console/vite.config.ts`

```typescript
// 改造前
proxy: {
  '/api/': { target: ... },
  '/v1': { target: ... },
  '/health': { target: ... },
}

// 改造后
proxy: {
  '/api': { target: ... },
  '/health': { target: ... },
  '/webhooks': { target: ... },
}
```

### 2. Admin App (`apps/admin`)

#### 2.1 API Paths 配置

**文件**: `apps/admin/src/lib/api-paths.ts`

> **无需修改**: 所有路径已经使用 `/api/admin/...` 格式。

#### 2.2 Vite Proxy 配置

**文件**: `apps/admin/vite.config.ts`

> **无需修改**: 已经配置 `/api/*` 代理。

---

## 改造步骤

### Phase 1: 后端改造

- [ ] 1.1 修改 `main.ts` 添加全局前缀和版本控制
- [ ] 1.2 修改 7 个 Public API Controllers 添加 `@Version('1')`
- [ ] 1.3 修改 13 个 Console/Admin Controllers 添加 `@Version(VERSION_NEUTRAL)`
- [ ] 1.4 运行后端测试确保所有路由正确

### Phase 2: 前端改造

- [ ] 2.1 修改 Console 的 `vite.config.ts` 代理配置
- [ ] 2.2 修改 Admin 的 `vite.config.ts` 代理配置（如需要）
- [ ] 2.3 本地测试前后端联调

### Phase 3: 验证

- [ ] 3.1 测试所有 Public API 端点 (`/api/v1/...`)
- [ ] 3.2 测试所有 Console API 端点 (`/api/console/...`)
- [ ] 3.3 测试所有 Admin API 端点 (`/api/admin/...`)
- [ ] 3.4 测试 Health Check (`/health`)
- [ ] 3.5 测试 Webhook 回调 (`/webhooks/creem`)

---

## 文件变更汇总

### 后端 (15 个文件)

| 文件 | 变更类型 |
|------|----------|
| `apps/server/src/main.ts` | 添加 setGlobalPrefix + enableVersioning |
| `apps/server/src/memory/memory.controller.ts` | 添加 @Version('1') |
| `apps/server/src/entity/entity.controller.ts` | 添加 @Version('1') |
| `apps/server/src/relation/relation.controller.ts` | 添加 @Version('1') |
| `apps/server/src/graph/graph.controller.ts` | 添加 @Version('1') |
| `apps/server/src/extract/extract.controller.ts` | 添加 @Version('1') |
| `apps/server/src/quota/quota.controller.ts` | 添加 @Version('1') |
| `apps/server/src/usage/usage.controller.ts` | 添加 @Version('1') |
| `apps/server/src/api-key/api-key.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/memory/console-memory.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/entity/console-entity.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/stats/console-stats.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/webhook/webhook.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/user/user.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/payment/payment.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/auth/auth.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/admin/admin-auth.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/admin/admin-dashboard.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/admin/admin-users.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/admin/admin-subscriptions.controller.ts` | 添加 VERSION_NEUTRAL |
| `apps/server/src/admin/admin-orders.controller.ts` | 添加 VERSION_NEUTRAL |

### 前端 (1-2 个文件)

| 文件 | 变更类型 |
|------|----------|
| `apps/console/vite.config.ts` | 简化代理配置 |
| `apps/admin/vite.config.ts` | 可能需要调整 |

---

*Created: 2026-01*
