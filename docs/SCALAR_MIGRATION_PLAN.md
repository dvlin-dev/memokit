# Swagger → Scalar + Zod 迁移方案

## 核心原则（强制）

- **最佳实践**：遵循 AGENTS.md v1.3 规范
- **单一职责**：每个文件只做一件事
- **模块化**：清晰的模块边界和依赖关系
- **错误边界**：自定义 HttpException，优雅降级
- **不考虑历史兼容**：直接删除/重构旧代码
- **无用代码删除**：不保留 deprecated 注释，直接删除

---

## 目标

1. 使用 **Scalar** 替换 Swagger UI
2. 使用 **Zod** 替换 class-validator
3. 统一模块结构，符合 AGENTS.md 规范

---

## 依赖变更

### 安装

```bash
# nestjs-zod 支持 Zod v4，提供 createZodDto, ZodValidationPipe, cleanupOpenApiDoc
pnpm add nestjs-zod @scalar/nestjs-api-reference --filter @memai/server
```

### 移除（Phase 5）

```bash
pnpm remove class-validator class-transformer --filter @memai/server
```

### 保留

- `zod` - 已安装 v4.x
- `@nestjs/swagger` - DocumentBuilder, SwaggerModule.createDocument, 装饰器

---

## 模块改造清单

### 需要新增的模块

| 模块 | 路径 | 说明 |
|------|------|------|
| **openapi** | `src/openapi/` | Scalar + OpenAPI 配置（✅ 已完成） |

### 需要改造的业务模块（按优先级）

| 优先级 | 模块 | 路径 | 现有 DTO | 改造内容 |
|--------|------|------|----------|----------|
| P0 | **memory** | `src/memory/` | `create-memory.dto.ts`, `search-memory.dto.ts` | Zod schema + errors |
| P0 | **entity** | `src/entity/` | `create-entity.dto.ts` | Zod schema + errors |
| P0 | **relation** | `src/relation/` | `create-relation.dto.ts` | Zod schema + errors |
| P1 | **api-key** | `src/api-key/` | `create-api-key.dto.ts`, `update-api-key.dto.ts` | Zod schema + errors |
| P1 | **webhook** | `src/webhook/` | `create-webhook.dto.ts`, `update-webhook.dto.ts` | Zod schema + errors |
| P1 | **user** | `src/user/` | `change-password.dto.ts`, `update-profile.dto.ts`, `delete-account.dto.ts` | Zod schema + errors |
| P2 | **payment** | `src/payment/` | `payment.dto.ts` | Zod schema + errors |
| P2 | **graph** | `src/graph/` | 无 DTO | 添加 schema (如需要) |
| P2 | **extract** | `src/extract/` | 无 DTO | 添加 schema (如需要) |

### 需要改造的基础设施模块

| 模块 | 路径 | 改造内容 |
|------|------|----------|
| **admin** | `src/admin/` | 添加 DTO schemas，统一 Controller 装饰器 |
| **auth** | `src/auth/` | 清理，统一装饰器 |
| **health** | `src/health/` | 已有完整装饰器，无需大改 |
| **quota** | `src/quota/` | 检查是否需要 DTO |
| **subscription** | `src/subscription/` | 检查是否需要 DTO |
| **usage** | `src/usage/` | 检查是否需要 DTO |

### 需要删除/清理的文件

| 文件 | 路径 | 原因 |
|------|------|------|
| `types/` 目录 | `src/types/` | 合并到各模块 dto/*.schema.ts |
| `shared.types.ts` | `src/types/shared.types.ts` | 迁移到对应模块 |
| `user.types.ts` | `src/types/user.types.ts` | 迁移到 user/dto/ |
| `api-key.types.ts` | `src/api-key/api-key.types.ts` | 迁移到 dto/api-key.schema.ts |
| `payment.types.ts` | `src/payment/payment.types.ts` | 迁移到 dto/payment.schema.ts |

---

## 标准模块结构

每个业务模块改造后应符合以下结构：

```
module-name/
├── dto/
│   ├── index.ts                    # 导出所有 DTO
│   └── module-name.schema.ts       # Zod schemas + types + DTO classes
├── module-name.module.ts           # NestJS 模块定义
├── module-name.controller.ts       # API 控制器 (@ApiKeyGuard)
├── module-name-console.controller.ts # Console 控制器 [可选]
├── module-name.service.ts          # 业务逻辑
├── module-name.constants.ts        # 常量、错误码
├── module-name.errors.ts           # 自定义 HttpException
└── index.ts                        # 公共导出
```

---

## 新增模块：openapi（✅ 已完成）

### 目录结构

```
src/openapi/
├── index.ts
├── openapi.module.ts
├── openapi.service.ts
├── openapi.constants.ts
└── scalar.middleware.ts
```

### openapi.module.ts

```typescript
import { Module } from '@nestjs/common';
import { OpenApiService } from './openapi.service';

@Module({
  providers: [OpenApiService],
  exports: [OpenApiService],
})
export class OpenApiModule {}
```

### openapi.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { DocumentBuilder } from '@nestjs/swagger';

@Injectable()
export class OpenApiService {
  buildConfig() {
    return new DocumentBuilder()
      .setTitle('Memai API')
      .setDescription('Memory as a Service - AI-Powered Memory Management')
      .setVersion('1.0.0')
      .setContact('Memai', 'https://memai.dev', 'support@memai.dev')
      .addApiKey(
        { type: 'apiKey', name: 'X-API-Key', in: 'header' },
        'apiKey',
      )
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addTag('Memory', 'Memory CRUD operations')
      .addTag('Entity', 'Entity management')
      .addTag('Relation', 'Relationship management')
      .addTag('Graph', 'Knowledge graph operations')
      .addTag('Search', 'Search and retrieval')
      .addTag('ApiKey', 'API key management')
      .addTag('Webhook', 'Webhook management')
      .addTag('User', 'User profile management')
      .addTag('Health', 'Health check endpoints')
      .addTag('Admin', 'Admin operations')
      .build();
  }
}
```

### openapi.constants.ts

```typescript
export const SCALAR_CONFIG = {
  REFERENCE_PATH: '/api-reference',
  OPENAPI_JSON_PATH: '/openapi.json',
  THEME: 'default',
  DEFAULT_HTTP_CLIENT: { targetKey: 'node', clientKey: 'fetch' },
  HIDDEN_CLIENTS: { c: true, clojure: true, objc: true, ocaml: true, r: true },
} as const;

export const AUTH_CONFIG = {
  preferredSecurityScheme: 'apiKey',
  securitySchemes: {
    apiKey: { name: 'X-API-Key', in: 'header' as const, value: '' },
  },
} as const;
```

### scalar.middleware.ts

```typescript
import { apiReference } from '@scalar/nestjs-api-reference';
import { SCALAR_CONFIG, AUTH_CONFIG } from './openapi.constants';

export function createScalarMiddleware(options: {
  openApiJsonUrl: string;
  proxyUrl?: string;
}) {
  return apiReference({
    url: options.openApiJsonUrl,
    theme: SCALAR_CONFIG.THEME,
    authentication: AUTH_CONFIG,
    persistAuth: true,
    defaultHttpClient: SCALAR_CONFIG.DEFAULT_HTTP_CLIENT,
    hiddenClients: SCALAR_CONFIG.HIDDEN_CLIENTS,
    ...(options.proxyUrl && { proxyUrl: options.proxyUrl }),
    metaData: {
      title: 'Memai API Reference',
      description: 'Interactive API documentation for Memai',
    },
  });
}
```

---

## 入口文件改造（✅ 已完成）

### main.ts

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, VersioningType, type INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import {
  OpenApiService,
  SCALAR_CONFIG,
  createScalarMiddleware,
} from './openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... 其他配置 ...

  // OpenAPI + Scalar
  setupOpenApi(app, logger);

  await app.listen(process.env.PORT ?? 3000);
}

function setupOpenApi(app: INestApplication, logger: Logger): void {
  try {
    const openApiService = app.get(OpenApiService);
    const config = openApiService.buildConfig();
    const document = SwaggerModule.createDocument(app, config);
    const cleanedDoc = cleanupOpenApiDoc(document);

    // Serve OpenAPI JSON
    app.use(SCALAR_CONFIG.OPENAPI_JSON_PATH, (_req, res) => {
      res.json(cleanedDoc);
    });

    // Serve Scalar API Reference
    app.use(
      SCALAR_CONFIG.REFERENCE_PATH,
      createScalarMiddleware({
        openApiJsonUrl: SCALAR_CONFIG.OPENAPI_JSON_PATH,
        proxyUrl: process.env.SCALAR_PROXY_URL,
      }),
    );

    logger.log(`API Reference available at ${SCALAR_CONFIG.REFERENCE_PATH}`);
  } catch (error) {
    // Error boundary: don't prevent app startup
    logger.error('OpenAPI setup failed:', error);
  }
}

bootstrap();
```

### app.module.ts（✅ 已完成）

```typescript
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { OpenApiModule } from './openapi';

@Module({
  imports: [
    OpenApiModule,
    // ... 其他模块
  ],
  providers: [
    // Global Zod validation pipe
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    // Global Zod serializer interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
```

---

## Schema 文件模板

### dto/memory.schema.ts

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ========== Field Schemas ==========

const ContentSchema = z
  .string()
  .min(1, 'Content is required')
  .max(10000, 'Content too long');

const MetadataSchema = z.record(z.unknown()).optional();

// ========== Request Schemas ==========

export const CreateMemorySchema = z.object({
  content: ContentSchema,
  userId: z.string().optional(),
  metadata: MetadataSchema,
});

export const UpdateMemorySchema = z.object({
  content: ContentSchema.optional(),
  metadata: MetadataSchema,
});

export const SearchMemorySchema = z.object({
  query: z.string().min(1),
  userId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
});

// ========== Response Schemas ==========

export const MemorySchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  userId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const MemoryListSchema = z.object({
  data: z.array(MemorySchema),
  total: z.number(),
});

// ========== Inferred Types ==========

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>;
export type SearchMemoryInput = z.infer<typeof SearchMemorySchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type MemoryList = z.infer<typeof MemoryListSchema>;

// ========== DTO Classes ==========

export class CreateMemoryDto extends createZodDto(CreateMemorySchema) {}
export class UpdateMemoryDto extends createZodDto(UpdateMemorySchema) {}
export class SearchMemoryDto extends createZodDto(SearchMemorySchema) {}
export class MemoryDto extends createZodDto(MemorySchema) {}
export class MemoryListDto extends createZodDto(MemoryListSchema) {}
```

---

## 错误处理模板

### memory.errors.ts

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export type MemoryErrorCode =
  | 'MEMORY_NOT_FOUND'
  | 'MEMORY_CREATE_FAILED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'MEMORY_SEARCH_FAILED';

export abstract class MemoryError extends HttpException {
  constructor(
    public readonly code: MemoryErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ success: false, error: { code, message, details } }, status);
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super('MEMORY_NOT_FOUND', `Memory not found: ${id}`, HttpStatus.NOT_FOUND, { id });
  }
}

export class MemoryLimitExceededError extends MemoryError {
  constructor(limit: number, current: number) {
    super(
      'MEMORY_LIMIT_EXCEEDED',
      `Memory limit exceeded`,
      HttpStatus.FORBIDDEN,
      { limit, current },
    );
  }
}

export class MemorySearchFailedError extends MemoryError {
  constructor(reason: string) {
    super(
      'MEMORY_SEARCH_FAILED',
      `Memory search failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { reason },
    );
  }
}
```

---

## 实施阶段

### Phase 1: 基础设施 ✅ 已完成

1. [x] 安装依赖 (`nestjs-zod`, `@scalar/nestjs-api-reference`)
2. [x] 创建 `openapi/` 模块
3. [x] 修改 `main.ts` (cleanupOpenApiDoc + Scalar)
4. [x] 配置全局 ZodValidationPipe 和 ZodSerializerInterceptor
5. [x] 删除旧 Swagger 配置
6. [x] TypeCheck 通过

### Phase 2: 核心模块 ✅ 已完成

7. [x] **memory** 模块改造
   - [x] 创建 `dto/memory.schema.ts`
   - [x] 创建 `memory.errors.ts`
   - [x] 更新 Controller 装饰器
   - [x] 删除旧 DTO 文件

8. [x] **entity** 模块改造
   - [x] 创建 `dto/entity.schema.ts`
   - [x] 创建 `entity.errors.ts`
   - [x] 更新 Controller

9. [x] **relation** 模块改造
   - [x] 创建 `dto/relation.schema.ts`
   - [x] 创建 `relation.errors.ts`
   - [x] 更新 Controller

### Phase 3: 业务模块 ✅ 已完成

10. [x] **api-key** 模块改造
11. [x] **webhook** 模块改造
12. [x] **user** 模块改造
13. [x] **payment** 模块改造
14. [x] **graph** 模块检查/改造
15. [x] **extract** 模块检查/改造

### Phase 4: 基础设施模块 ✅ 已完成

16. [x] **admin** 模块装饰器统一
17. [x] **auth** 模块清理
18. [x] **quota/subscription/usage** 检查

### Phase 5: 清理 ✅ 已完成

19. [x] 保留 `src/types/` 目录（共享类型如 CurrentUserDto）
20. [x] 删除所有旧 `*.types.ts` 文件（api-key.types.ts, payment.types.ts 已迁移到 dto/）
21. [x] 使用 Zod 替代手动验证
22. [x] 运行 TypeCheck: `pnpm --filter server typecheck` ✅
23. [ ] 运行测试: `pnpm --filter server test`
24. [ ] 更新 AGENTS.md

---

## 需要删除的代码

### main.ts 中已删除

```typescript
// 已删除这些行
const swaggerConfig = new DocumentBuilder()
  .setTitle('Memory API')
  // ...
  .build();
const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api-docs', app, document);
```

### 待删除的文件（Phase 5）

```
src/types/shared.types.ts
src/types/user.types.ts
src/api-key/api-key.types.ts
src/payment/payment.types.ts
src/memory/dto/create-memory.dto.ts (旧版)
src/memory/dto/search-memory.dto.ts (旧版)
src/entity/dto/create-entity.dto.ts (旧版)
src/relation/dto/create-relation.dto.ts (旧版)
src/api-key/dto/create-api-key.dto.ts (旧版)
src/api-key/dto/update-api-key.dto.ts (旧版)
src/webhook/dto/create-webhook.dto.ts (旧版)
src/webhook/dto/update-webhook.dto.ts (旧版)
src/user/dto/change-password.dto.ts (旧版)
src/user/dto/update-profile.dto.ts (旧版)
src/user/dto/delete-account.dto.ts (旧版)
src/payment/dto/payment.dto.ts (旧版)
```

---

## API 端点变更

| 旧端点 | 新端点 | 说明 |
|--------|--------|------|
| `/api-docs` | `/api-reference` | Scalar UI |
| - | `/openapi.json` | OpenAPI JSON |

---

## 验收标准

- [x] `/api-reference` 可访问，显示完整 API 文档
- [x] `/openapi.json` 返回有效的 OpenAPI 3.0 JSON
- [x] 所有请求参数有 Zod 验证
- [x] 所有响应有 OpenAPI schema
- [x] 使用 nestjs-zod 替代 class-validator
- [x] 旧 `*.types.ts` 文件已迁移到 dto/
- [x] TypeCheck 通过
- [ ] 单元测试通过

---

*Version: 2.2 | Updated: 2026-01-04*
