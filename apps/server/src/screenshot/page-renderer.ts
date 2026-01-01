/**
 * [INPUT]: BrowserContext + ScreenshotOptions
 * [OUTPUT]: 截图 Buffer + 页面元信息
 * [POS]: 页面渲染逻辑，负责页面加载、配置和截图执行
 */

import { Injectable, Logger } from '@nestjs/common';
import type { BrowserContext, Page } from 'playwright';
import type { ScreenshotOptions, PageMeta, ImageFormat, RenderResult, RenderMode } from './screenshot.types';
import { DEVICE_PRESETS } from './screenshot.types';
import {
  PAGE_LOAD_TIMEOUT,
  SELECTOR_WAIT_TIMEOUT,
  VISUAL_RESOURCES_TIMEOUT,
  RENDER_MODE_CONFIG,
  LOADING_CHECK_INTERVAL,
  LOADING_SELECTORS,
} from './screenshot.constants';
import {
  PageLoadFailedError,
  PageTimeoutError,
  SelectorNotFoundError,
  ScreenshotFailedError,
} from './screenshot.errors';

@Injectable()
export class PageRenderer {
  private readonly logger = new Logger(PageRenderer.name);

  /**
   * 渲染页面并截图
   */
  async render(context: BrowserContext, options: ScreenshotOptions): Promise<RenderResult> {
    const page = await context.newPage();

    try {
      // 1. 配置页面
      await this.configurePage(page, options);

      // 2. 加载页面（记录时间）
      const pageLoadStart = Date.now();
      await this.loadPage(page, options.url, options.renderMode);

      // 3. 等待额外条件
      await this.waitForConditions(page, options);
      const pageLoadMs = Date.now() - pageLoadStart;

      // 4. 页面处理（隐藏元素、执行脚本）
      await this.processPage(page, options);

      // 5. 提取元信息
      const meta = await this.extractMeta(page);

      // 6. 执行截图（记录时间）
      const captureStart = Date.now();
      const { buffer, width, height } = await this.takeScreenshot(page, options);
      const captureMs = Date.now() - captureStart;

      return {
        buffer,
        width,
        height,
        meta,
        timings: { pageLoadMs, captureMs },
      };
    } finally {
      // 确保页面关闭
      await page.close().catch(() => {});
    }
  }

  /**
   * 配置页面（viewport、UA、darkMode 等）
   */
  private async configurePage(page: Page, options: ScreenshotOptions): Promise<void> {
    // 获取视口尺寸（设备预设优先）
    let width = options.width;
    let height = options.height;
    let userAgent = options.userAgent;

    if (options.device && DEVICE_PRESETS[options.device]) {
      const preset = DEVICE_PRESETS[options.device];
      width = preset.width;
      height = preset.height;
      if (preset.userAgent && !userAgent) {
        userAgent = preset.userAgent;
      }
    }

    // 设置视口
    await page.setViewportSize({ width, height });

    // 设置 User-Agent
    if (userAgent) {
      await page.setExtraHTTPHeaders({
        'User-Agent': userAgent,
      });
    }

    // 设置深色模式
    if (options.darkMode) {
      await page.emulateMedia({ colorScheme: 'dark' });
    }
  }

  /**
   * 加载页面并等待就绪
   */
  private async loadPage(page: Page, url: string, renderMode: RenderMode): Promise<void> {
    const config = RENDER_MODE_CONFIG[renderMode];

    // 阶段一：页面导航 + 必须资源
    await this.navigatePage(page, url, config.waitUntil);
    await this.waitForResources(page);

    // 阶段二：智能检测（loading 消失 + DOM 稳定）
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
    try {
      const response = await page.goto(url, {
        waitUntil,
        timeout: PAGE_LOAD_TIMEOUT,
      });

      if (response && response.status() >= 400) {
        throw new PageLoadFailedError(url, `HTTP ${response.status()}`);
      }
    } catch (error) {
      if (error instanceof PageLoadFailedError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('Timeout') || message.includes('timeout')) {
        throw new PageTimeoutError(url, PAGE_LOAD_TIMEOUT);
      }

      throw new PageLoadFailedError(url, message);
    }
  }

  /**
   * 等待必须资源（CSS、首屏图片、字体）
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

          // CSS 样式表
          document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
            if (!link.sheet) {
              promises.push(
                new Promise((r) => {
                  link.onload = link.onerror = () => r();
                }),
              );
            }
          });

          // 首屏图片
          document.querySelectorAll('img').forEach((img) => {
            if (isInViewport(img) && !img.complete) {
              promises.push(
                new Promise((r) => {
                  img.onload = img.onerror = () => r();
                }),
              );
            }
          });

          // 字体
          if (document.fonts?.ready) {
            promises.push(document.fonts.ready.then(() => {}));
          }

          Promise.race([Promise.all(promises), new Promise((r) => setTimeout(r, timeout))]).then(
            () => resolve(),
          );
        });
      }, VISUAL_RESOURCES_TIMEOUT);
    } catch {
      // 资源等待失败不阻塞截图
    }
  }

  /**
   * 智能检测页面就绪（loading 消失 + DOM 稳定）
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

            // DOM 稳定性监控（只监控 childList，不监控 attributes 避免轮播图等动画影响）
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
                  if (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0'
                  ) {
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
              const domStable = Date.now() - lastDomChange >= domStableThreshold;

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

  /**
   * 等待额外条件（delay、waitFor）
   */
  private async waitForConditions(page: Page, options: ScreenshotOptions): Promise<void> {
    // 等待指定的选择器
    if (options.waitFor) {
      try {
        await page.waitForSelector(options.waitFor, {
          timeout: SELECTOR_WAIT_TIMEOUT,
          state: 'visible',
        });
      } catch {
        throw new SelectorNotFoundError(options.waitFor, 'waitFor');
      }
    }

    // 额外等待时间
    if (options.delay > 0) {
      await page.waitForTimeout(options.delay);
    }
  }

  /**
   * 页面处理（隐藏元素、执行脚本）
   */
  private async processPage(page: Page, options: ScreenshotOptions): Promise<void> {
    // 隐藏指定元素
    if (options.hide && options.hide.length > 0) {
      await this.hideElements(page, options.hide);
    }

    // 执行自定义脚本
    if (options.scripts) {
      await this.executeScripts(page, options.scripts);
    }
  }

  /**
   * 隐藏指定元素
   */
  private async hideElements(page: Page, selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      try {
        await page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel);
          elements.forEach((el) => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        }, selector);
      } catch (error) {
        this.logger.warn(`Failed to hide element "${selector}": ${error}`);
      }
    }
  }

  /**
   * 执行自定义脚本
   */
  private async executeScripts(page: Page, scripts: string): Promise<void> {
    try {
      await page.evaluate(scripts);
    } catch (error) {
      this.logger.warn(`Custom script execution failed: ${error}`);
    }
  }

  /**
   * 提取页面元信息
   */
  private async extractMeta(page: Page): Promise<PageMeta> {
    try {
      const meta = await page.evaluate(() => {
        // 获取标题
        const title = document.title || undefined;

        // 获取描述
        const descMeta =
          document.querySelector('meta[name="description"]') ||
          document.querySelector('meta[property="og:description"]');
        const description = descMeta?.getAttribute('content') || undefined;

        // 获取 favicon
        const linkIcon =
          document.querySelector('link[rel="icon"]') ||
          document.querySelector('link[rel="shortcut icon"]');
        let favicon: string | undefined;
        if (linkIcon) {
          const href = linkIcon.getAttribute('href');
          if (href) {
            // 处理相对路径
            try {
              favicon = new URL(href, window.location.href).toString();
            } catch {
              favicon = href;
            }
          }
        }

        return { title, description, favicon };
      });

      return meta;
    } catch (error) {
      this.logger.warn(`Failed to extract meta: ${error}`);
      return {};
    }
  }

  /**
   * 执行截图
   */
  private async takeScreenshot(
    page: Page,
    options: ScreenshotOptions,
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    try {
      // 确定截图类型
      const screenshotOptions: {
        type: 'png' | 'jpeg';
        quality?: number;
        fullPage?: boolean;
      } = {
        type: this.getPlaywrightFormat(options.format),
        fullPage: options.fullPage,
      };

      // JPEG/WebP 需要设置质量
      if (options.format !== 'png') {
        screenshotOptions.quality = options.quality;
      }

      let buffer: Buffer;
      let width: number;
      let height: number;

      // 元素截图 vs 页面截图
      if (options.clip) {
        // 元素截图
        const element = await page.$(options.clip);
        if (!element) {
          throw new SelectorNotFoundError(options.clip, 'clip');
        }

        buffer = await element.screenshot(screenshotOptions);

        // 获取元素尺寸
        const box = await element.boundingBox();
        width = box?.width || 0;
        height = box?.height || 0;
      } else {
        // 页面截图
        buffer = await page.screenshot(screenshotOptions);

        // 获取视口尺寸
        const viewportSize = page.viewportSize();
        width = viewportSize?.width || options.width;

        if (options.fullPage) {
          // 全页面截图，获取实际高度
          const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
          height = bodyHeight;
        } else {
          height = viewportSize?.height || options.height;
        }
      }

      return { buffer, width, height };
    } catch (error) {
      if (error instanceof SelectorNotFoundError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ScreenshotFailedError(message);
    }
  }

  /**
   * 转换为 Playwright 支持的格式
   * 注意：Playwright 原生不支持 WebP，需要后续用 Sharp 转换
   */
  private getPlaywrightFormat(format: ImageFormat): 'png' | 'jpeg' {
    // WebP 先截图为 PNG，后续用 Sharp 转换
    if (format === 'webp') {
      return 'png';
    }
    return format;
  }
}
