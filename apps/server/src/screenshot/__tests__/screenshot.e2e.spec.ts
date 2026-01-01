/**
 * Screenshot API E2E 测试
 * 测试完整的 HTTP 请求流程
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { createHash } from 'crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ScreenshotModule } from '../screenshot.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { AuthModule } from '../../auth/auth.module';
import { PrismaService } from '../../prisma/prisma.service';
import { PageRenderer } from '../page-renderer';
import { R2Service } from '../../storage/r2.service';
import { SCREENSHOT_QUEUE } from '../../queue/queue.constants';
import { TestContainers } from '../../../test/helpers/containers';
import { MockFactory } from '../../../test/helpers/mock.factory';

// 跳过 E2E 测试（需要 Docker）
const skipE2E = !process.env.RUN_INTEGRATION_TESTS;

describe.skipIf(skipE2E)('Screenshot API (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testApiKey: string;
  let testApiKeyHash: string;

  const mockPageRenderer = MockFactory.createPageRenderer();
  const mockR2Service = MockFactory.createR2Service();
  const mockQueue = MockFactory.createQueue();

  beforeAll(async () => {
    // 启动 Testcontainers
    await TestContainers.start();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL: process.env.DATABASE_URL,
              REDIS_URL: process.env.REDIS_URL,
              NODE_ENV: 'test',
            }),
          ],
        }),
        BullModule.forRoot({
          connection: {
            url: process.env.REDIS_URL,
          },
        }),
        BullModule.registerQueue({
          name: SCREENSHOT_QUEUE,
        }),
        PrismaModule,
        RedisModule,
        AuthModule,
        ScreenshotModule,
      ],
    })
      .overrideProvider(PageRenderer)
      .useValue(mockPageRenderer)
      .overrideProvider(R2Service)
      .useValue(mockR2Service)
      .overrideProvider(getQueueToken(SCREENSHOT_QUEUE))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication();

    // 添加全局管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await TestContainers.stop();
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // 清理数据库
    await prisma.$transaction([
      prisma.screenshot.deleteMany(),
      prisma.quotaTransaction.deleteMany(),
      prisma.quota.deleteMany(),
      prisma.apiKey.deleteMany(),
      prisma.subscription.deleteMany(),
      prisma.session.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    // 创建测试用户和 API Key
    const userId = 'user_e2e_test';
    testApiKey = 'mk_test_e2e_api_key_secret';
    testApiKeyHash = createHash('sha256').update(testApiKey).digest('hex');

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await prisma.user.create({
      data: {
        id: userId,
        email: 'e2e@test.com',
        name: 'E2E Test User',
        emailVerified: true,
      },
    });

    // 创建 PRO 订阅
    await prisma.subscription.create({
      data: {
        userId,
        tier: 'PRO',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
      },
    });

    await prisma.apiKey.create({
      data: {
        userId,
        name: 'E2E Test Key',
        keyHash: testApiKeyHash,
        keyPrefix: 'mk_test',
      },
    });

    // 创建配额
    await prisma.quota.create({
      data: {
        userId,
        monthlyLimit: 20000,
        monthlyUsed: 0,
        purchasedQuota: 0,
        periodStartAt: now,
        periodEndAt: nextMonth,
      },
    });
  });

  describe('POST /api/v1/screenshot', () => {
    it('无 API Key 时返回 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
    });

    it('无效 API Key 返回 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', 'mk_invalid_key')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
    });

    it('有效 API Key 应该成功创建截图请求', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'https://example.com',
          width: 1280,
          height: 800,
          format: 'png',
          sync: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it('缺少必填参数返回 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({});

      expect(response.status).toBe(400);
    });

    it('无效 URL 格式返回 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'not-a-valid-url',
        });

      expect(response.status).toBe(400);
    });

    it('SSRF 攻击（私有 IP）返回 403', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'http://192.168.1.1',
        });

      expect(response.status).toBe(403);
    });

    it('localhost 访问返回 403', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'http://localhost:3000',
        });

      expect(response.status).toBe(403);
    });

    it('云厂商 Metadata 地址返回 403', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'http://169.254.169.254/latest/meta-data',
        });

      expect(response.status).toBe(403);
    });

    it('应该接受所有可选参数', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'https://example.com',
          width: 1920,
          height: 1080,
          fullPage: true,
          format: 'jpeg',
          quality: 90,
          delay: 1000,
          darkMode: true,
          sync: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('尺寸超过套餐限制返回 400', async () => {
      // PRO 套餐最大宽度通常有限制
      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'https://example.com',
          width: 10000, // 超大尺寸
          height: 10000,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/screenshot/:id', () => {
    it('无 API Key 时返回 401', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/screenshot/some-id',
      );

      expect(response.status).toBe(401);
    });

    it('不存在的截图返回 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/screenshot/nonexistent-id')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(404);
    });

    it('应该返回已创建的截图', async () => {
      // 先创建一个截图
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'https://example.com',
          sync: false,
        });

      expect(createResponse.status).toBe(200);
      const screenshotId = createResponse.body.data.id;

      // 查询截图
      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/screenshot/${screenshotId}`)
        .set('X-API-Key', testApiKey);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.id).toBe(screenshotId);
    });

    it('不能访问其他用户的截图', async () => {
      // 创建另一个用户
      const otherUserId = 'user_other_test';
      const otherApiKey = 'mk_other_user_key';
      const otherApiKeyHash = createHash('sha256').update(otherApiKey).digest('hex');

      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await prisma.user.create({
        data: {
          id: otherUserId,
          email: 'other@test.com',
          name: 'Other User',
          emailVerified: true,
        },
      });

      await prisma.apiKey.create({
        data: {
          userId: otherUserId,
          name: 'Other Key',
          keyHash: otherApiKeyHash,
          keyPrefix: 'mk_other',
        },
      });

      await prisma.quota.create({
        data: {
          userId: otherUserId,
          monthlyLimit: 100,
          monthlyUsed: 0,
          purchasedQuota: 0,
          periodStartAt: now,
          periodEndAt: nextMonth,
        },
      });

      // 用原始用户创建截图
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'https://example.com',
          sync: false,
        });

      const screenshotId = createResponse.body.data.id;

      // 尝试用其他用户访问
      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/screenshot/${screenshotId}`)
        .set('X-API-Key', otherApiKey);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('配额管理', () => {
    it('每次请求应该扣减配额', async () => {
      // 获取初始配额
      const initialQuota = await prisma.quota.findUnique({
        where: { userId: 'user_e2e_test' },
      });

      // 发送请求
      await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'https://example.com',
          sync: false,
        });

      // 检查配额变化
      const afterQuota = await prisma.quota.findUnique({
        where: { userId: 'user_e2e_test' },
      });

      expect(afterQuota!.monthlyUsed).toBe(initialQuota!.monthlyUsed + 1);
    });

    it('配额耗尽时返回错误', async () => {
      // 设置配额为 0
      await prisma.quota.update({
        where: { userId: 'user_e2e_test' },
        data: {
          monthlyUsed: 20000,
          purchasedQuota: 0,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/screenshot')
        .set('X-API-Key', testApiKey)
        .send({
          url: 'https://example.com',
        });

      // 应该返回配额相关错误
      expect([402, 429]).toContain(response.status);
    });
  });
});
