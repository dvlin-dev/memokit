# memory 技术架构

> 网页截图 API 服务的整体技术架构文档

---

## 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端框架** | React 19 + Vite | 用户控制台 + 管理后台 |
| **后端框架** | NestJS 11 + Prisma 7 | API 服务 |
| **数据库** | PostgreSQL | 主数据库 |
| **缓存/队列** | Redis + BullMQ | 缓存 + 异步任务 |
| **截图引擎** | Playwright | 无头浏览器 |
| **图片处理** | Sharp | 格式转换、压缩 |
| **存储** | Cloudflare R2 | 截图文件存储 |
| **CDN** | Cloudflare | 全球加速 |
| **认证** | Better Auth | 用户认证 |
| **支付** | Creem | 订阅 + 按量付费 |
| **邮件** | Resend | 邮件通知 |
| **日志** | Pino | 结构化日志 |
| **API 文档** | Swagger/OpenAPI | 接口文档 |

---

## 项目结构

```
memory.dev/
├── apps/
│   ├── server/                    # 后端 API
│   │   ├── src/
│   │   │   ├── admin/             # 管理后台 API
│   │   │   ├── api-key/           # API Key 管理
│   │   │   ├── auth/              # 认证模块
│   │   │   ├── browser/           # 浏览器池管理
│   │   │   ├── common/            # 公共模块
│   │   │   ├── config/            # 配置模块
│   │   │   ├── email/             # 邮件服务
│   │   │   ├── health/            # 健康检查
│   │   │   ├── payment/           # 支付模块
│   │   │   ├── prisma/            # 数据库 ORM
│   │   │   ├── queue/             # 任务队列
│   │   │   ├── quota/             # 配额管理
│   │   │   ├── redis/             # 缓存模块
│   │   │   ├── screenshot/        # 截图核心模块
│   │   │   ├── storage/           # R2 存储
│   │   │   ├── types/             # 类型定义
│   │   │   ├── user/              # 用户模块
│   │   │   └── webhook/           # Webhook 模块
│   │   └── prisma/
│   │       └── schema.prisma      # 数据库 Schema
│   │
│   ├── console/                   # 用户控制台
│   │   └── src/
│   │       ├── pages/             # 页面组件
│   │       ├── features/          # 功能模块
│   │       ├── components/        # 布局组件
│   │       ├── lib/               # 工具函数
│   │       └── stores/            # 状态管理
│   │
│   └── admin/                     # 管理后台
│       └── src/
│           ├── pages/             # 页面组件
│           ├── features/          # 功能模块
│           ├── components/        # 布局组件
│           └── stores/            # 状态管理
│
├── packages/
│   ├── ui/                        # 共享 UI 组件库
│   │   └── src/
│   │       ├── components/
│   │       │   ├── primitives/    # 基础组件 (50+)
│   │       │   └── composed/      # 业务组件
│   │       ├── hooks/             # 自定义 Hooks
│   │       └── lib/               # 工具函数
│   │
│   └── shared-types/              # 共享类型定义
│       └── src/
│           ├── api.ts             # API 类型
│           ├── screenshot.ts      # 截图类型
│           ├── tier.ts            # 套餐类型
│           └── user.ts            # 用户类型
│
├── Dockerfile                     # Server 容器
├── Dockerfile.console             # Console 容器
├── Dockerfile.admin               # Admin 容器
└── pnpm-workspace.yaml            # Monorepo 配置
```

---

## 后端架构

### 模块依赖图

```
┌─────────────────────────────────────────────────────────────┐
│                       AppModule                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Config  │  │  Prisma  │  │  Redis   │  │  Queue   │    │
│  │ (全局)   │  │ (全局)   │  │ (全局)   │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│       │             │             │             │           │
│  ┌────▼─────────────▼─────────────▼─────────────▼────┐     │
│  │                  基础设施层                         │     │
│  └───────────────────────────────────────────────────┘     │
│       │                                                     │
│  ┌────▼─────────────────────────────────────────────┐      │
│  │                   业务模块层                       │      │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │      │
│  │  │  Auth  │ │  User  │ │ Payment│ │ Storage│    │      │
│  │  └────────┘ └────────┘ └────────┘ └────────┘    │      │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │      │
│  │  │API Key │ │ Quota  │ │Webhook │ │ Email  │    │      │
│  │  └────────┘ └────────┘ └────────┘ └────────┘    │      │
│  └──────────────────────────────────────────────────┘      │
│       │                                                     │
│  ┌────▼─────────────────────────────────────────────┐      │
│  │                   核心业务层                       │      │
│  │  ┌─────────────────────────────────────────────┐ │      │
│  │  │                Screenshot                    │ │      │
│  │  │  ┌──────────┐ ┌────────────┐ ┌───────────┐ │ │      │
│  │  │  │ Browser  │ │PageRenderer│ │ImageProc  │ │ │      │
│  │  │  │   Pool   │ │            │ │  (Sharp)  │ │ │      │
│  │  │  └──────────┘ └────────────┘ └───────────┘ │ │      │
│  │  └─────────────────────────────────────────────┘ │      │
│  └──────────────────────────────────────────────────┘      │
│       │                                                     │
│  ┌────▼─────────────────────────────────────────────┐      │
│  │                   管理模块层                       │      │
│  │  ┌────────────────────────────────────────────┐  │      │
│  │  │                  Admin                      │  │      │
│  │  │  Dashboard │ Users │ Orders │ Subscriptions│  │      │
│  │  └────────────────────────────────────────────┘  │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块说明

| 模块 | 职责 |
|------|------|
| **screenshot** | 截图核心服务：URL 验证、缓存、配额、任务调度 |
| **browser** | Playwright 浏览器池管理 |
| **api-key** | API Key 的生成、验证、管理 |
| **quota** | 配额检查、扣减、重置 |
| **webhook** | Webhook 配置、事件推送 |
| **payment** | Creem 支付集成、订阅管理 |
| **storage** | R2 文件存储 |
| **auth** | Better Auth 认证 |
| **admin** | 管理后台 API |

### 数据模型

```
┌─────────────────────────────────────────────────────────────┐
│                        数据模型关系                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐                                               │
│  │   User   │◄──────────────────────────────────┐           │
│  └────┬─────┘                                    │           │
│       │                                          │           │
│  ┌────▼─────┐  ┌──────────┐  ┌──────────────┐   │           │
│  │ Session  │  │ Account  │  │ Subscription │   │           │
│  └──────────┘  └──────────┘  └──────────────┘   │           │
│                                                  │           │
│  ┌──────────┐  ┌──────────────────┐             │           │
│  │  Quota   │  │ QuotaTransaction │             │           │
│  └──────────┘  └──────────────────┘             │           │
│                                                  │           │
│  ┌──────────┐  ┌──────────────┐                 │           │
│  │  ApiKey  │──┤  Screenshot  ├─────────────────┘           │
│  └──────────┘  └──────────────┘                             │
│                                                              │
│  ┌──────────┐  ┌─────────────────┐                          │
│  │ Webhook  │──┤ WebhookDelivery │                          │
│  └──────────┘  └─────────────────┘                          │
│                                                              │
│  ┌──────────────┐                                           │
│  │ PaymentOrder │                                           │
│  └──────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 主要数据表

| 表名 | 说明 |
|------|------|
| User | 用户账户 |
| Session/Account | Better Auth 会话 |
| Subscription | 订阅状态（FREE/BASIC/PRO/TEAM） |
| Quota | 配额（月度 + 购买） |
| QuotaTransaction | 配额变动记录 |
| ApiKey | API 密钥（前缀 + 哈希） |
| Screenshot | 截图记录（含性能指标） |
| Webhook | Webhook 配置 |
| WebhookDelivery | Webhook 投递记录 |
| PaymentOrder | 支付订单 |

---

## 前端架构

### Console（用户控制台）

```
console.memory.dev
│
├── 技术栈
│   ├── React 19 + Vite
│   ├── TanStack Router（路由）
│   ├── TanStack Query（数据请求）
│   ├── Zustand（状态管理）
│   ├── Tailwind CSS 4
│   └── @memory/ui（组件库）
│
└── 页面结构
    ├── LoginPage        # 登录
    ├── DashboardPage    # 用量概览
    ├── ApiKeysPage      # API Key 管理
    ├── ScreenshotsPage  # 截图历史
    ├── PlaygroundPage   # API 调试
    ├── WebhooksPage     # Webhook 配置
    └── SettingsPage     # 账户设置
```

### Admin（管理后台）

```
admin.memory.dev
│
├── 技术栈（同 Console）
│
└── 页面结构
    ├── LoginPage           # 管理员登录
    ├── DashboardPage       # 系统概览
    ├── UsersPage           # 用户管理
    ├── OrdersPage          # 订单管理
    └── SubscriptionsPage   # 订阅管理
```

### 共享 UI 组件库 (@memory/ui)

```typescript
// 使用方式
import { Button, Input, Dialog } from '@memory/ui/primitives'
import { DataTable, PageHeader } from '@memory/ui/composed'
import { usePagination } from '@memory/ui/hooks'
```

| 分类 | 组件数量 | 说明 |
|------|----------|------|
| primitives | 50+ | Radix UI 基础组件 |
| composed | 6 | DataTable、PageHeader 等 |
| hooks | 多个 | useMobile、usePagination 等 |

---

## API 路由设计

### 公开 API（API Key 认证）

```
POST   /api/v1/screenshot        # 创建截图
GET    /api/v1/screenshot/:id    # 查询截图
GET    /api/v1/quota             # 查询配额
```

### 控制台 API（Session 认证）

```
# API Key 管理
GET    /api/console/api-keys
POST   /api/console/api-keys
PATCH  /api/console/api-keys/:id
DELETE /api/console/api-keys/:id

# 截图历史
GET    /api/console/screenshots

# Webhook
GET    /api/console/webhooks
POST   /api/console/webhooks
PATCH  /api/console/webhooks/:id
DELETE /api/console/webhooks/:id

# 订阅
GET    /api/console/subscription
POST   /api/console/subscription/checkout
POST   /api/console/subscription/cancel
```

### 管理后台 API（Admin 认证）

```
GET    /api/admin/dashboard/stats
GET    /api/admin/users
GET    /api/admin/users/:id
GET    /api/admin/orders
GET    /api/admin/subscriptions
```

---

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    console.memory.dev     admin.memory.dev              │
│           │                        │                         │
│    ┌──────▼──────┐         ┌──────▼──────┐                  │
│    │   Console   │         │    Admin    │                  │
│    │   (Nginx)   │         │   (Nginx)   │                  │
│    └──────┬──────┘         └──────┬──────┘                  │
│           │                        │                         │
│           └───────────┬────────────┘                         │
│                       │                                      │
│                       ▼                                      │
│            api.memory.dev                                  │
│            ┌──────────────────┐                             │
│            │   NestJS Server  │                             │
│            │     (Docker)     │                             │
│            └────────┬─────────┘                             │
│                     │                                        │
│      ┌──────────────┼──────────────┐                        │
│      │              │              │                         │
│      ▼              ▼              ▼                         │
│  PostgreSQL      Redis       Cloudflare R2                  │
│  (Database)    (Cache/Queue)   (Storage)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 容器配置

| 服务 | 基础镜像 | 端口 |
|------|----------|------|
| Server | node:22-slim + playwright | 3000 |
| Console | nginx:alpine | 80 |
| Admin | nginx:alpine | 80 |

### 环境变量

```bash
# 数据库
DATABASE_URL="postgresql://..."

# Redis
REDIS_HOST="..."
REDIS_PORT="6379"
REDIS_PASSWORD="..."

# R2 存储
S3_ENDPOINT="..."
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
S3_BUCKET="memory-screenshots"

# 认证
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="https://console.memory.dev"

# 支付
CREEM_API_KEY="..."
CREEM_WEBHOOK_SECRET="..."

# 邮件
RESEND_API_KEY="..."
```

---

## 核心流程

### 截图请求流程

```
Request → ApiKeyGuard → RateLimit → UrlValidator → CacheCheck
    ↓
QuotaCheck → ConcurrentCheck → CreateTask → BullMQ
    ↓
Processor → BrowserPool → PageRender → ImageProcess → R2Upload
    ↓
CacheWrite → UpdateRecord → Webhook → Response
```

### 配额扣减规则

1. **优先级**：月度配额 → 购买配额
2. **时机**：请求时预扣，失败时返还
3. **缓存命中**：不扣配额

### 并发控制

| 套餐 | 并发数 |
|------|--------|
| FREE | 2 |
| BASIC | 5 |
| PRO | 10 |
| TEAM | 20 |

---

## 测试策略

| 类型 | 工具 | 范围 |
|------|------|------|
| 单元测试 | Vitest | Service、Utils |
| 集成测试 | Supertest + Testcontainers | API 端到端 |
| E2E 测试 | Playwright | 前端流程 |

---

*版本: 2.0 | 更新: 2026-01*
