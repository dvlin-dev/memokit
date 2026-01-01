# Memory 官网功能规范

> 官网 (www) 是 Memory 的门户网站，提供产品介绍和 Playground 演示功能

---

## 一、项目概述

### 1.1 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | Vite + React 19 | 快速构建，现代 React |
| 路由 | React Router v7 | SPA 路由 |
| 样式 | Tailwind CSS 4 | 复用 monorepo 配置 |
| 组件 | @memory/ui | 共享组件库 |
| 图标 | Lucide React | 一致的图标风格 |
| 部署 | Cloudflare Pages | 边缘部署，需配置环境变量 |

### 1.2 域名架构

| 域名 | 应用 | 说明 |
|------|------|------|
| `memory.dev` | www | 官网（本模块） |
| `server.memory.dev` | server | API 服务 |
| `console.memory.dev` | console | 用户控制台 |
| `admin.memory.dev` | admin | 管理后台 |

### 1.3 目录结构

```
apps/www/
├── src/
│   ├── components/
│   │   ├── layout/          # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Container.tsx
│   │   ├── landing/         # 首页各 Section
│   │   │   ├── HeroSection.tsx
│   │   │   ├── PlaygroundSection.tsx
│   │   │   ├── StatsSection.tsx
│   │   │   ├── UseCasesSection.tsx
│   │   │   ├── CodeExampleSection.tsx
│   │   │   ├── FeaturesSection.tsx
│   │   │   ├── PricingSection.tsx
│   │   │   └── CTASection.tsx
│   │   └── playground/      # Playground 组件
│   │       ├── QuickPlayground.tsx
│   │       ├── UrlInput.tsx
│   │       ├── PresetButtons.tsx
│   │       ├── ResultPreview.tsx
│   │       ├── StatsBar.tsx
│   │       └── Turnstile.tsx
│   ├── pages/
│   │   └── HomePage.tsx     # 首页
│   ├── lib/
│   │   └── api.ts           # API 客户端
│   ├── types/
│   │   └── turnstile.d.ts   # Turnstile 类型定义
│   └── App.tsx              # 路由入口
└── package.json
```

---

## 二、首页模块规范

### 2.1 页面结构

首页由以下 Section 按顺序组成：

| Section | 职责 | 关键交互 |
|---------|------|----------|
| Header | 导航栏 | Logo、导航链接、Console 入口 |
| HeroSection | 产品标语 + CTA | 引导用户注册或查看文档 |
| PlaygroundSection | 在线演示 | **核心功能**：用户输入 URL 获取截图 |
| StatsSection | 社会证明 | 展示关键数据指标 |
| UseCasesSection | 使用场景 | 展示产品适用领域 |
| CodeExampleSection | 代码示例 | 多语言 Tab 切换展示 API 调用 |
| FeaturesSection | 功能特性 | 网格展示核心功能 |
| PricingSection | 定价方案 | 展示套餐和价格 |
| CTASection | 底部号召 | 最终转化入口 |
| Footer | 页脚 | 链接、版权信息 |

### 2.2 组件设计原则

1. **单一职责**：每个 Section 独立封装，可单独复用
2. **Props 最小化**：Section 组件无外部依赖，数据内聚
3. **响应式优先**：所有组件支持移动端

---

## 三、Playground 核心流程

### 3.1 功能定位

官网 Playground 是**简化版演示**，与 Console Playground 的区别：

| 功能 | Console Playground | 官网 Quick Playground |
|------|-------------------|----------------------|
| 认证 | 需要 API Key | 无需认证 |
| 参数 | 完整配置项 | 固定参数 |
| 限流 | 按配额 | IP 限流 + 强制验证码 |
| 输出 | 多格式 | 仅 URL |

### 3.2 用户交互流程

```
┌─────────────────────────────────────────────────────────────┐
│                      Playground 状态流转                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [空闲] ──输入URL──▶ [就绪] ──点击截图──▶ [加载中]          │
│      ▲                                       │              │
│      │                      ┌────────────────┼──────┐       │
│      │                      ▼                ▼      ▼       │
│      └───── 重新输入 ─── [成功]          [错误]  [超时]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 前端调用规范

**Step 1: 获取配置**

```
GET /api/demo/config
Response: { siteKey: string | undefined }
```

- 页面加载时调用，获取 Turnstile site key
- 可缓存 5 分钟

**Step 2: 执行截图**

```
POST /api/demo/screenshot
Body: { url: string, captcha: string }
Response: { success: true, imageUrl: string, captureTime: number }
```

- captcha 为必填参数

**Step 3: 错误处理**

| 错误码 | 含义 | 前端处理 |
|--------|------|----------|
| `INVALID_REQUEST` | 参数校验失败 | 提示用户检查 URL 或验证码 |
| `RATE_LIMIT_EXCEEDED` | IP 限流 | 提示稍后重试 |
| `CAPTCHA_INVALID` | 验证码无效 | 重置验证码组件 |

---

## 四、后端 Demo 模块规范

### 4.1 模块结构

```
apps/server/src/demo/
├── demo.module.ts       # 模块定义
├── demo.controller.ts   # 路由处理
├── demo.service.ts      # 业务逻辑
└── demo.dto.ts          # 数据校验
```

### 4.2 公开路由配置

Demo 模块需要 `@Public()` 装饰器跳过全局认证：

```typescript
@Controller('api/demo')
@Public()  // 必须：跳过 AuthGuard
export class DemoController { ... }
```

### 4.3 防滥用策略

| 策略 | 阈值 | 说明 |
|------|------|------|
| IP 限流 | 10 次/分钟 | 单 IP 调用频率限制 |
| 强制验证码 | - | 所有请求必须通过 Turnstile 验证 |
| 固定参数 | - | 截图尺寸、格式等不可自定义 |
| 小时计数 | - | 用于数据统计，不影响验证码决策 |

### 4.4 Turnstile 验证机制

所有 Demo 截图请求必须携带有效的 Turnstile token：

1. 前端加载时获取 `siteKey`
2. 用户完成 Turnstile 验证获取 token
3. 请求时携带 token，后端验证有效性
4. Token 一次性使用，每次截图后需重新验证

---

## 五、环境变量配置

### 5.1 前端 (www)

| 变量 | 必填 | 说明 |
|------|------|------|
| `VITE_API_URL` | 是 | API 地址，如 `https://server.memory.dev` |

### 5.2 后端 (server)

| 变量 | 必填 | 说明 |
|------|------|------|
| `TURNSTILE_SITE_KEY` | 是 | Cloudflare Turnstile 站点密钥 |
| `TURNSTILE_SECRET_KEY` | 是 | Cloudflare Turnstile 私钥 |
| `ALLOWED_ORIGINS` | 是 | CORS 白名单，需包含 `https://memory.dev` |

---

## 六、部署清单

### 6.1 Cloudflare Pages (www)

1. 连接 GitHub 仓库
2. 构建命令：`pnpm --filter @memory/www build`
3. 输出目录：`apps/www/dist`
4. 环境变量：`VITE_API_URL=https://server.memory.dev`

### 6.2 后端服务 (server)

1. 配置 `ALLOWED_ORIGINS` 包含官网域名
2. 配置 Turnstile 密钥
3. 确保 Demo 模块已注册

---

## 七、扩展指南

### 7.1 新增页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/App.tsx` 添加路由
3. 在 Header 添加导航链接（如需要）

### 7.2 新增 Landing Section

1. 在 `src/components/landing/` 创建组件
2. 在 `index.ts` 导出
3. 在 `HomePage.tsx` 按顺序引入

### 7.3 修改 Playground 行为

1. 前端逻辑：`src/components/playground/QuickPlayground.tsx`
2. API 调用：`src/lib/api.ts`
3. 后端逻辑：`apps/server/src/demo/demo.service.ts`

---

## 八、设计规范

### 8.1 视觉风格

- **配色**：黑白为主，橙色强调色
- **字体**：等宽字体用于代码/标题，无衬线字体用于正文
- **间距**：大量留白，呼吸感强
- **边框**：直角边框，细线条

### 8.2 响应式断点

| 断点 | 布局策略 |
|------|----------|
| `≥1024px` (Desktop) | 多列网格，横向布局 |
| `768-1023px` (Tablet) | 2 列网格，保持横向 |
| `<768px` (Mobile) | 单列堆叠，全宽输入框 |

---

*版本: 2.0 | 更新: 2026-01*
