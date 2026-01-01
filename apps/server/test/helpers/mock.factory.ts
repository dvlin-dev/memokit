/**
 * Mock 数据/服务工厂
 * 用于单元测试和集成测试
 */
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import type { SubscriptionTier } from '../../src/types/tier.types';
import type {
  ScreenshotOptions,
  ImageFormat,
  RenderResult,
  PageMeta,
  RenderMode,
} from '../../src/screenshot/screenshot.types';

interface MockService {
  [key: string]: Mock | ((...args: unknown[]) => unknown);
}

export const MockFactory: {
  createUser: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  createApiKey: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  createScreenshotRequest: (overrides?: Partial<ScreenshotOptions>) => ScreenshotOptions;
  createRenderResult: (overrides?: Partial<RenderResult>) => RenderResult;
  createPageMeta: (overrides?: Partial<PageMeta>) => PageMeta;
  createRedisService: () => MockService;
  createR2Service: () => MockService;
  createPageRenderer: () => MockService;
  createImageProcessor: () => MockService;
  createQuotaService: () => MockService;
  createConfigService: (config?: Record<string, unknown>) => MockService;
  createQueue: () => MockService;
} = {
  // ============ 用户相关 ============

  /**
   * 创建 Mock 用户
   */
  createUser(overrides: Partial<{
    id: string;
    email: string;
    name: string;
    tier: SubscriptionTier;
  }> = {}) {
    return {
      id: 'user_test123',
      email: 'test@example.com',
      name: 'Test User',
      tier: 'FREE' as SubscriptionTier,
      ...overrides,
    };
  },

  /**
   * 创建 Mock API Key
   */
  createApiKey(overrides: Partial<{
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
  }> = {}) {
    return {
      id: 'apikey_test123',
      userId: 'user_test123',
      name: 'Test API Key',
      keyHash: 'hash_test_key',
      keyPrefix: 'mk_test',
      ...overrides,
    };
  },

  // ============ 截图相关 ============

  /**
   * 创建 Mock 截图请求
   */
  createScreenshotRequest(overrides: Partial<ScreenshotOptions> = {}): ScreenshotOptions {
    return {
      url: 'https://example.com',
      width: 1280,
      height: 800,
      format: 'png' as ImageFormat,
      quality: 80,
      renderMode: 'fast' as RenderMode,
      delay: 0,
      fullPage: false,
      darkMode: false,
      response: 'url',
      sync: true,
      timeout: 30000,
      ...overrides,
    };
  },

  /**
   * 创建 Mock 渲染结果
   */
  createRenderResult(overrides: Partial<RenderResult> = {}): RenderResult {
    return {
      buffer: Buffer.from('mock-image-data'),
      width: 1280,
      height: 800,
      meta: {
        title: 'Test Page',
        description: 'Test description',
        favicon: 'https://example.com/favicon.ico',
      },
      timings: {
        pageLoadMs: 500,
        captureMs: 100,
      },
      ...overrides,
    };
  },

  /**
   * 创建 Mock 页面元信息
   */
  createPageMeta(overrides: Partial<PageMeta> = {}): PageMeta {
    return {
      title: 'Test Page',
      description: 'Test description',
      favicon: 'https://example.com/favicon.ico',
      ...overrides,
    };
  },

  // ============ 服务 Mock ============

  /**
   * 创建 Mock Redis 服务
   */
  createRedisService() {
    return {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      incr: vi.fn().mockResolvedValue(1),
      decr: vi.fn().mockResolvedValue(0),
      expire: vi.fn().mockResolvedValue(true),
      tryAcquireProcessingLock: vi.fn().mockResolvedValue(null),
      releaseProcessingLock: vi.fn().mockResolvedValue(undefined),
    };
  },

  /**
   * 创建 Mock R2 服务
   */
  createR2Service() {
    return {
      uploadFile: vi.fn().mockResolvedValue(undefined),
      uploadStream: vi.fn().mockResolvedValue(undefined),
      downloadStream: vi.fn().mockResolvedValue({
        stream: null,
        contentLength: 1000,
        contentType: 'image/png',
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      isConfigured: vi.fn().mockReturnValue(true),
      getPublicUrl: vi.fn().mockImplementation((key: string) => `https://cdn.example.com/${key}`),
    };
  },

  /**
   * 创建 Mock PageRenderer（避免真实 Playwright）
   */
  createPageRenderer() {
    return {
      render: vi.fn().mockResolvedValue({
        buffer: Buffer.from('mock-image-data'),
        width: 1280,
        height: 800,
        meta: { title: 'Test Page' },
      }),
    };
  },

  /**
   * 创建 Mock ImageProcessor
   */
  createImageProcessor() {
    return {
      process: vi.fn().mockImplementation(async (input: Buffer) => ({
        buffer: input,
        fileSize: input.length,
        width: 1280,
        height: 800,
      })),
      convert: vi.fn().mockImplementation(async (input: Buffer) => input),
      getInfo: vi.fn().mockResolvedValue({
        width: 1280,
        height: 800,
        format: 'png',
      }),
    };
  },

  /**
   * 创建 Mock QuotaService
   */
  createQuotaService() {
    return {
      checkRateLimit: vi.fn().mockResolvedValue(undefined),
      deductOrThrow: vi.fn().mockResolvedValue({ source: 'SUBSCRIPTION' }),
      refund: vi.fn().mockResolvedValue(undefined),
      incrementConcurrent: vi.fn().mockResolvedValue(undefined),
      decrementConcurrent: vi.fn().mockResolvedValue(undefined),
      getTierLimits: vi.fn().mockReturnValue({
        maxWidth: 3840,
        maxHeight: 2160,
        maxDelay: 10000,
      }),
      isFeatureAllowed: vi.fn().mockReturnValue(true),
    };
  },

  /**
   * 创建 Mock ConfigService
   */
  createConfigService(config: Record<string, unknown> = {}) {
    const defaultConfig: Record<string, unknown> = {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      R2_BUCKET: 'test-bucket',
      R2_PUBLIC_URL: 'https://cdn.example.com',
      SCREENSHOT_CACHE_TTL: 3600,
    };

    const mergedConfig = { ...defaultConfig, ...config };

    return {
      get: vi.fn().mockImplementation((key: string, defaultValue?: any) => {
        return mergedConfig[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn().mockImplementation((key: string) => {
        if (!(key in mergedConfig)) {
          throw new Error(`Config key ${key} not found`);
        }
        return mergedConfig[key];
      }),
    };
  },

  /**
   * 创建 Mock BullMQ Queue
   */
  createQueue() {
    return {
      add: vi.fn().mockResolvedValue({ id: 'job_test123' }),
      getJob: vi.fn().mockResolvedValue(null),
      close: vi.fn().mockResolvedValue(undefined),
    };
  },
};
