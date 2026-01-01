# Memory

> 本文档是 AI Agent 的核心指南。遵循 [agents.md 规范](https://agents.md/)。

## 项目定位

**网页截图 API 服务** - 输入网址，即刻获取网页截图。专为独立开发者和小型团队打造的高性价比截图解决方案。

## 核心同步协议（强制）

1. **原子更新规则**：任何代码变更完成后，必须同步更新相关目录的 AGENTS.md
2. **递归触发**：文件变更 → 更新文件 Header → 更新所属目录 AGENTS.md → （若影响全局）更新根 AGENTS.md
3. **分形自治**：任何子目录的 AGENTS.md 都应让 AI 能独立理解该模块的上下文
4. **禁止历史包袱**：不做向后兼容，无用代码直接删除/重构，不保留废弃注释

## 项目结构

| 目录 | 说明 | 详细规范 |
| --- | --- | --- |
| `apps/server/` | 后端 API + 截图引擎（NestJS） | → `apps/server/AGENTS.md` |
| `apps/console/` | 用户控制台（React + Vite） | → `apps/console/AGENTS.md` |
| `packages/shared-types/` | 共享类型定义 | → `packages/shared-types/AGENTS.md` |

### 技术栈速查

| 层级 | 技术 |
| --- | --- |
| 前端 | Vite + React + TypeScript + TailwindCSS + shadcn/ui |
| 后端 | NestJS + Prisma + PostgreSQL + Redis + BullMQ |
| 截图引擎 | Playwright + Sharp |
| 存储 | Cloudflare R2 + CDN |
| 认证 | Better Auth |
| 支付 | Creem |
| 包管理 | pnpm workspace |

## 核心模块概览

### Server 模块结构

```
apps/server/src/
├── auth/           # 认证模块（Better Auth）
├── user/           # 用户管理
├── api-key/        # API Key 管理
├── quota/          # 配额管理
├── screenshot/     # 截图服务（核心）
├── browser/        # 浏览器实例池（全局模块）
├── payment/        # 支付处理（Creem）
├── storage/        # R2 存储
├── redis/          # Redis 缓存
├── queue/          # BullMQ 队列
├── prisma/         # 数据库
├── email/          # 邮件服务
├── config/         # 配置（套餐定价等）
├── common/         # 公共守卫、装饰器
├── types/          # 共享类型定义
└── health/         # 健康检查
```

### 核心业务流程

1. **截图请求流程**：认证 → 频率限制 → URL 安全验证 → 缓存查询 → 配额扣减 → 并发控制 → 任务入队 → 返回结果
2. **配额扣减规则**：月度订阅配额优先 → 按量购买配额兜底 → 失败自动返还
3. **缓存策略**：全局共享缓存，命中不扣配额

## 功能文档

- **技术规范**（核心参考文档）：→ [`TECH_SPEC.md`](./TECH_SPEC.md)
- **测试规范**：→ [`TEST_SPEC.md`](./TEST_SPEC.md)
- **产品定位**：→ [`README.md`](./README.md)

## 协作总则

- 全程中文沟通、提交、文档
- 先查后做：不猜实现，用搜索对照现有代码
- 不定义业务语义：产品/数据含义先确认需求方
- 复用优先：现有接口、类型、工具优先复用
- 参考 moryflow：本项目基于 moryflow 架构，遇到不确定的实现时可参考 `/Users/bowling/code/me/moryflow`

## 工作流程

1. **计划**：改动前给出最小范围 plan，说明动机与风险
2. **实施**：聚焦单一问题，不盲改
3. **校验**：本地跑 lint/typecheck（`pnpm typecheck`），通过再提交
4. **同步**：更新相关 AGENTS.md（本条强制）

## 文件头注释规范

关键文件需在开头添加注释，格式根据文件类型选择：

| 文件类型 | 格式 |
| --- | --- |
| 服务/逻辑 | `[INPUT]` / `[OUTPUT]` / `[POS]` |
| React 组件 | `[PROPS]` / `[EMITS]` / `[POS]` |
| 工具函数集 | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| 类型定义 | `[DEFINES]` / `[USED_BY]` / `[POS]` |

示例：

```typescript
/**
 * [INPUT]: ScreenshotRequest - 截图请求参数
 * [OUTPUT]: ScreenshotResponse - 截图结果或错误
 * [POS]: 截图服务核心，被 screenshot.controller.ts 调用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
```

## 目录规范

组件或模块目录结构：

- `index.ts` - 入口/导出
- `*.controller.ts` - 路由控制器（后端）
- `*.service.ts` - 业务逻辑
- `*.module.ts` - NestJS 模块定义
- `*.types.ts` - 模块类型定义（必须独立文件）
- `*.constants.ts` - 模块常量配置（必须独立文件）
- `dto/` - 数据传输对象（使用 Zod）
- `components/` - 子组件（前端）

## 类型与 DTO 规范

### DTO 验证（强制使用 Zod）

所有请求 DTO 必须使用 Zod schema 进行运行时验证：

```typescript
// ✅ 正确：使用 Zod schema
// dto/create-api-key.dto.ts
import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(50),
  expiresAt: z.string().datetime().optional(),
});

export type CreateApiKeyDto = z.infer<typeof createApiKeySchema>;

// controller.ts 中使用
@Post()
async create(@Body() body: unknown) {
  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.issues[0]?.message);
  }
  // 使用 parsed.data
}
```

```typescript
// ❌ 错误：Class-based DTO 无运行时验证
export class CreateApiKeyDto {
  name!: string;
  expiresAt?: Date;
}
```

### 类型文件组织（禁止内联）

类型定义必须放在独立的 `*.types.ts` 文件中，禁止在业务代码中内联定义：

```typescript
// ✅ 正确：类型集中在 .types.ts
// screenshot/screenshot.types.ts
export interface RequestContext {
  userId: string;
  apiKeyId: string | null;
  tier: SubscriptionTier;
  options: ScreenshotOptions;
}

// screenshot/screenshot.service.ts
import type { RequestContext } from './screenshot.types';
```

```typescript
// ❌ 错误：在业务代码中内联类型
// screenshot/screenshot.service.ts
interface RequestContext {  // 不要在这里定义
  userId: string;
  // ...
}
```

### 常量文件组织

常量配置必须放在独立的 `*.constants.ts` 文件中：

```typescript
// ✅ 正确：常量集中在 .constants.ts
// payment/payment.constants.ts
export const TIER_MONTHLY_QUOTA: Record<SubscriptionTier, number> = {
  FREE: 100,
  BASIC: 5000,
  PRO: 20000,
  TEAM: 60000,
};
```

### 类型安全要点

1. **使用强类型**：避免 `string`，使用具体的联合类型或枚举
   ```typescript
   // ✅ tier: SubscriptionTier
   // ❌ tier: string
   ```

2. **统一类型定义**：同一类型只定义一次，其他地方引用
   ```typescript
   // ✅ 引用 types/ 目录的共享类型
   import type { CurrentUserDto } from '../types';

   // ❌ 重复定义相同结构
   interface User { id: string; email: string; ... }
   ```

3. **导出约定**：
   - Schema 使用 `export const xxxSchema`
   - 类型使用 `export type { XxxDto }`
   - 在 `index.ts` 中统一导出

公共函数区分：

- **模块内 `helper.ts`** - 模块专属逻辑，仅服务于当前模块
- **全局 `common/`** - 跨模块复用的守卫、装饰器、过滤器
- **全局 `utils/`** - 纯工具函数，无业务状态依赖

## 代码原则

### 核心原则

1. **单一职责（SRP）**：每个函数/组件只做一件事
2. **开放封闭（OCP）**：对扩展开放，对修改封闭
3. **最小知识（LoD）**：只与直接依赖交互，避免深层调用
4. **依赖倒置（DIP）**：依赖抽象而非具体实现
5. **组合优于继承**：用 Hooks 和组合模式复用逻辑
6. 不确定的事情要联网搜索，用到的库也要使用最新的版本，并联网查询最新的使用文档

### 代码实践

1. **纯函数优先**：逻辑尽量实现为纯函数，便于测试
2. **提前返回**：early return 减少嵌套，提高可读性
3. **职责分离**：常量、工具、逻辑、UI 各司其职
4. **DRY 原则**：相同逻辑抽离复用，不重复自己
5. **避免过早优化**：先保证正确性和可读性

### 注释规范

1. **核心逻辑必须注释**：复杂算法、业务规则、边界条件需要注释说明
2. **命名辅助理解**：清晰命名 + 必要注释，两者配合而非二选一
3. **中文注释**：使用简短中文注释，对外 API 补充 JSDoc

### 禁止事项

1. **不要历史兼容**：无用代码直接删除/重构
2. **不保留废弃注释**：禁止 `// deprecated`、`// removed`、`_unused` 等
3. **不猜测实现**：先搜索确认，再动手修改

## 命名规范

| 类型 | 规范 | 示例 |
| --- | --- | --- |
| 组件/类型 | PascalCase | `ScreenshotService` |
| 函数/变量 | camelCase | `handleScreenshot` |
| 常量 | UPPER_SNAKE_CASE | `MAX_CONCURRENT` |
| 组件文件夹 | PascalCase | `ApiKeyCard/` |
| 工具文件 | camelCase | `urlValidator.ts` |
| API Key 前缀 | `mk_` | `mk_abc123...` |

## 语言规范

| 场景 | 语言 | 说明 |
| --- | --- | --- |
| 文档/注释/提交 | 中文 | 沟通一致性 |
| 代码标识符 | 英文 | 编程惯例 |
| API 错误码 | 英文 | `QUOTA_EXCEEDED` |
| 用户界面（UI） | 英文 | 面向国外用户 |

### 前端界面语言规范（重要）

**代码注释保持中文**，方便开发者阅读；**用户可见的界面文本使用英文**，面向国际用户。

| 类型 | 语言 | 示例 |
| --- | --- | --- |
| 文件头注释 | 中文 | `/** API 客户端 */` |
| 函数/类型注释 | 中文 | `/** 获取 API Key 列表 */` |
| 行内注释 | 中文 | `// 添加 Authorization header` |
| 页面标题/描述 | 英文 | `title="Dashboard"` |
| 按钮/标签文字 | 英文 | `"Create API Key"` |
| Toast 提示消息 | 英文 | `toast.success('Created successfully')` |
| 表单验证消息 | 英文 | `'Please enter a valid email address'` |
| 错误提示信息 | 英文 | `'Session expired, please log in again'` |
| 占位符文字 | 英文 | `placeholder="Enter URL..."` |
| 侧边栏导航 | 英文 | `Dashboard`, `API Keys`, `Settings` |

```typescript
// ✅ 正确示例
/**
 * 获取 API Key 列表
 */
export function useApiKeys() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getApiKeys,
  })
}

// Toast 消息使用英文
toast.success('Created successfully')
toast.error('Failed to delete')

// 表单验证使用英文
const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})
```

## UI/UX 样式规范

### 设计风格

**Boxy and Sharp** - 方正锐利的设计风格。所有 UI 元素采用直角，禁止圆角。整体色调为柔和的黑白灰，强调色为橙色。

### 圆角规范（强制）

**全局禁止圆角**，所有组件必须使用 `rounded-none`：

```tsx
// ✅ 正确
<Card className="rounded-none">
<Button className="rounded-none">
<Input className="rounded-none">
<Badge className="rounded-none">

// ❌ 错误 - 任何圆角都不允许
<Card className="rounded-lg">
<Button className="rounded-md">
<Badge className="rounded-full">
```

> 注意：shadcn/ui 组件默认带圆角，使用时需显式添加 `rounded-none` 覆盖。

### 侧边栏导航样式（E2B 风格）

| 状态 | 文字颜色 | 背景色 | 字重 |
| --- | --- | --- | --- |
| 未选中 | `var(--sidebar-foreground)` 灰色 | 透明 | normal |
| 悬停 | `var(--foreground)` 黑色 | 透明 | normal |
| 选中 | `var(--sidebar-primary)` 橙色 | `#f2f2f2` 浅灰 | medium |

### 主题色变量

```css
/* 侧边栏 */
--sidebar-foreground: oklch(0.35 0 0);      /* 未选中文字：深灰 */
--sidebar-primary: oklch(0.65 0.18 45);     /* 选中文字：橙色 */

/* 强调色 */
--primary: oklch(0.25 0 0);                 /* 主色：深灰/黑 */
```

### 链接样式

- 普通链接：使用 `text-orange-500` 橙色
- 导航链接：遵循侧边栏样式规范

### Alert 组件使用

```tsx
// ✅ 一般提示：使用默认样式（黑色文字）
<Alert>
  <AlertDescription>提示信息</AlertDescription>
</Alert>

// ✅ 错误警告：使用 destructive
<Alert variant="destructive">
  <AlertDescription>错误信息</AlertDescription>
</Alert>

// ❌ 不要对普通提示使用 destructive（会显示橙色）
```

### Tailwind CSS v4 注意事项

项目使用 **Tailwind CSS v4.1.17**，注意以下差异：

1. **Data 属性变体**：
   - Radix UI 组件使用 `data-[state=active]:` 而非 `data-active:`
   ```tsx
   // ✅ Tailwind v4 + Radix UI
   className="data-[state=active]:bg-background"

   // ❌ 不生效
   className="data-active:bg-background"
   ```

2. **颜色透明度**：oklch 颜色的透明度修饰符可能不生效，建议使用内联样式或完整颜色值

3. **CSS 变量配置**：在 `globals.css` 的 `@theme inline` 块中定义

## 关键业务规则

### 套餐与配额

| 套餐 | 月费 | 月度配额 | 并发限制 |
| --- | --- | --- | --- |
| FREE | $0 | 100 | 2 |
| BASIC | $9 | 5,000 | 5 |
| PRO | $29 | 20,000 | 10 |
| TEAM | $79 | 60,000 | 20 |

### 配额扣减逻辑

```
优先级：月度订阅配额 → 按量购买配额
时机：请求时预扣，失败则返还
缓存命中：不扣配额，仍创建记录
```

### 安全要点

- **SSRF 防护**：URL 必须经过 `url-validator.ts` 验证
- **私有 IP 拦截**：禁止访问 localhost、内网 IP、云厂商 metadata
- **API Key 存储**：仅存储 SHA256 hash，明文仅创建时显示一次

## 开发执行顺序

当前进度参考 `TECH_SPEC.md` 中的「开发执行步骤」章节。

**已完成**：
- Phase 0：项目初始化
- Phase 1：数据库 & 基础模块
- Phase 1.5：存量模块适配
- Phase 2：API Key 模块
- Phase 3：配额模块
- Phase 4：截图模块 + Browser 模块
- Phase 4.5：测试基础设施（单元测试 + 集成测试 + E2E 测试框架）
- Phase 5：控制台前端（Dashboard、API Keys、Screenshots、Webhooks、Settings、Playground）
- Phase 5.5：管理后台（Dashboard、Users、Orders、Subscriptions）

**待开发**：
- Phase 6+：订阅支付、缓存优化、批量截图等

## 测试基础设施

测试规范详见 → [`TEST_SPEC.md`](./TEST_SPEC.md)

### 测试命令

```bash
pnpm --filter server test        # 运行所有测试（不含集成/E2E）
pnpm --filter server test:unit   # 运行单元测试
pnpm --filter server test:cov    # 带覆盖率报告
pnpm --filter server test:ci     # CI 完整测试（含集成/E2E + 覆盖率）
```

### 测试目录结构

```
apps/server/
├── vitest.config.ts              # Vitest 配置
├── test/
│   ├── setup.ts                  # 全局 setup
│   ├── helpers/                  # 测试辅助函数
│   │   ├── containers.ts         # Testcontainers 封装
│   │   ├── test-app.factory.ts   # NestJS TestingModule 工厂
│   │   └── mock.factory.ts       # Mock 工厂
│   └── fixtures/                 # 测试数据和页面
│       ├── seed.ts               # 共享测试数据
│       └── test-page.html        # 截图测试页面
└── src/screenshot/__tests__/     # 截图模块测试
    ├── url-validator.spec.ts     # 单元测试
    ├── image-processor.spec.ts   # 单元测试
    ├── screenshot.service.integration.spec.ts  # 集成测试
    └── screenshot.e2e.spec.ts    # E2E 测试
```

---

*版本: 1.3 | 更新: 2026-01*
