# 截图服务 renderMode 功能设计

## 问题

SPA 应用首屏是 loading 状态，截图捕获到的是 loading 而非实际内容。

## 解决方案

新增 `renderMode` 参数：

| 模式 | 值 | 页面加载策略 | 智能检测超时 | DOM 稳定阈值 |
|------|-----|-------------|-------------|-------------|
| 快速 | `fast`（默认） | `domcontentloaded` | 2 秒 | 300ms |
| 完整 | `complete` | `networkidle` | 5 秒 | 500ms |

## 流程设计

```
阶段一：必须等待
├── 1. 页面加载 (串行)
│       ↓
└── 2. 资源加载 (并行 Promise.all)
    ├── CSS 样式表
    ├── 首屏图片
    └── 字体
          ↓
阶段二：智能检测 (并行，全部满足才完成)
├── loading 指示器消失
└── DOM 结构稳定
          ↓
       截图
```

## 模块设计

### 1. 常量定义

```typescript
// screenshot.constants.ts

// 渲染模式配置
export const RENDER_MODE_CONFIG = {
  fast: {
    waitUntil: 'domcontentloaded' as const,
    pageReadyTimeout: 2000,
    domStableThreshold: 300,
  },
  complete: {
    waitUntil: 'networkidle' as const,
    pageReadyTimeout: 5000,
    domStableThreshold: 500,
  },
} as const;

// 通用配置
export const VISUAL_RESOURCES_TIMEOUT = 5000;
export const LOADING_CHECK_INTERVAL = 200;

// Loading 选择器
export const LOADING_SELECTORS = [
  '[class*="loading"]',
  '[class*="spinner"]',
  '[class*="skeleton"]',
  '[class*="loader"]',
  '[aria-busy="true"]',
  '[data-loading="true"]',
  '.ant-spin-spinning',
  '.el-loading-mask',
  '.v-skeleton-loader',
  'svg[class*="spin"]',
] as const;
```

### 2. 类型定义

```typescript
// screenshot.types.ts

export type RenderMode = 'fast' | 'complete';

export interface ScreenshotOptions {
  // ... 现有字段 ...
  renderMode: RenderMode;
}
```

### 3. DTO 验证

```typescript
// screenshot-request.dto.ts

renderMode: z.enum(['fast', 'complete']).default('fast'),
```

### 4. 页面渲染器

```typescript
// page-renderer.ts

@Injectable()
export class PageRenderer {
  /**
   * 加载页面并等待就绪
   */
  async loadPage(page: Page, url: string, renderMode: RenderMode): Promise<void> {
    const config = RENDER_MODE_CONFIG[renderMode];

    // 阶段一
    await this.navigatePage(page, url, config.waitUntil);
    await this.waitForResources(page);

    // 阶段二
    await this.waitForPageReady(page, config.pageReadyTimeout, config.domStableThreshold);
  }

  /**
   * 页面导航
   */
  private async navigatePage(
    page: Page,
    url: string,
    waitUntil: 'domcontentloaded' | 'networkidle',
  ): Promise<void> {
    const response = await page.goto(url, {
      waitUntil,
      timeout: PAGE_LOAD_TIMEOUT,
    });

    if (response && response.status() >= 400) {
      throw new PageLoadFailedError(url, `HTTP ${response.status()}`);
    }
  }

  /**
   * 等待必须资源（CSS、图片、字体）
   */
  private async waitForResources(page: Page): Promise<void> {
    try {
      await page.evaluate((timeout) => {
        return new Promise<void>((resolve) => {
          const promises: Promise<void>[] = [];
          const vh = window.innerHeight;
          const vw = window.innerWidth;

          const isInViewport = (el: Element): boolean => {
            const r = el.getBoundingClientRect();
            return r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0;
          };

          // CSS
          document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
            if (!(link as HTMLLinkElement).sheet) {
              promises.push(new Promise((r) => {
                link.onload = link.onerror = () => r();
              }));
            }
          });

          // 首屏图片
          document.querySelectorAll('img').forEach((img) => {
            if (isInViewport(img) && !img.complete) {
              promises.push(new Promise((r) => {
                img.onload = img.onerror = () => r();
              }));
            }
          });

          // 字体
          if (document.fonts?.ready) {
            promises.push(document.fonts.ready.then(() => {}));
          }

          Promise.race([
            Promise.all(promises),
            new Promise((r) => setTimeout(r, timeout)),
          ]).then(() => resolve());
        });
      }, VISUAL_RESOURCES_TIMEOUT);
    } catch {
      // 资源等待失败不阻塞截图
    }
  }

  /**
   * 智能检测页面就绪
   */
  private async waitForPageReady(
    page: Page,
    timeout: number,
    domStableThreshold: number,
  ): Promise<void> {
    try {
      await page.evaluate(
        ({ timeout, domStableThreshold, checkInterval, selectors }) => {
          return new Promise<void>((resolve) => {
            const startTime = Date.now();
            let lastDomChange = Date.now();

            // DOM 稳定性监控
            const observer = new MutationObserver(() => {
              lastDomChange = Date.now();
            });
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: false,
            });

            // 清理函数
            const cleanup = () => {
              clearInterval(intervalId);
              observer.disconnect();
              resolve();
            };

            // Loading 检测
            const hasLoading = (): boolean => {
              for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el) {
                  const style = getComputedStyle(el);
                  if (style.display !== 'none' &&
                      style.visibility !== 'hidden' &&
                      style.opacity !== '0') {
                    return true;
                  }
                }
              }
              return false;
            };

            // 轮询检测
            const intervalId = setInterval(() => {
              const elapsed = Date.now() - startTime;
              const noLoading = !hasLoading();
              const domStable = (Date.now() - lastDomChange) >= domStableThreshold;

              if ((noLoading && domStable) || elapsed >= timeout) {
                cleanup();
              }
            }, checkInterval);
          });
        },
        {
          timeout,
          domStableThreshold,
          checkInterval: LOADING_CHECK_INTERVAL,
          selectors: LOADING_SELECTORS,
        },
      );
    } catch {
      // 智能检测失败不阻塞截图
    }
  }
}
```

## 修改文件

| 文件 | 修改 |
|------|------|
| `screenshot.constants.ts` | 添加 `RENDER_MODE_CONFIG`、`LOADING_SELECTORS` |
| `screenshot.types.ts` | 添加 `RenderMode` 类型 |
| `screenshot-request.dto.ts` | 添加 `renderMode` 字段 |
| `page-renderer.ts` | 重构 `loadPage`，新增 `waitForResources`、`waitForPageReady` |

## API

```bash
# 快速模式（默认）
curl -X POST https://api.memory.dev/screenshot \
  -d '{"url": "https://example.com"}'

# 完整模式
curl -X POST https://api.memory.dev/screenshot \
  -d '{"url": "https://moryflow.com", "renderMode": "complete"}'
```
