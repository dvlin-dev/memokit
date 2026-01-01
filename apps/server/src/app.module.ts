import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { json, urlencoded, type Request, type Response } from 'express';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';
import { QueueModule } from './queue';
import { EmailModule } from './email';
import { AuthModule } from './auth';
import { UserModule } from './user';
import { PaymentModule } from './payment';
import { HealthModule } from './health';
import { ApiKeyModule } from './api-key';
import { SubscriptionModule } from './subscription';
import { QuotaModule } from './quota';
import { UsageModule } from './usage';
import { WebhookModule } from './webhook';
import { AdminModule } from './admin';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    QueueModule,
    EmailModule,
    AuthModule,
    UserModule,
    PaymentModule,
    HealthModule,
    ApiKeyModule,
    SubscriptionModule,
    QuotaModule,
    UsageModule,
    WebhookModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 保留原始 body 以支持 Better Auth 与 Webhook 验签
    const captureRawBody = (
      req: Request & { rawBody?: Buffer },
      _res: Response,
      buf: Buffer,
    ) => {
      if (buf?.length) {
        req.rawBody = Buffer.from(buf);
      }
    };

    consumer
      .apply(
        json({ verify: captureRawBody, limit: '50mb' }),
        urlencoded({ extended: true, verify: captureRawBody, limit: '50mb' }),
      )
      .forRoutes('*');
  }
}
