/**
 * OpenAPI document builder service
 *
 * [PROVIDES]: buildConfig() - OpenAPI document configuration
 * [POS]: Used by main.ts to configure Swagger/Scalar
 */
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
      .addCookieAuth('better-auth.session_token', {
        type: 'apiKey',
        in: 'cookie',
      })
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
      .addTag('Payment', 'Payment operations')
      .build();
  }
}
