/**
 * Payment DTOs
 * 支付相关的请求和响应数据结构
 */

import { z } from 'zod';

/**
 * Creem Webhook 负载 Schema
 * 根据 Creem 官方文档: https://docs.creem.io/code/webhooks
 */
export const CreemWebhookSchema = z.object({
  id: z.string().min(1),
  eventType: z.string().min(1),
  created_at: z.number(),
  object: z.object({
    id: z.string().min(1),
    product: z
      .object({ id: z.string().min(1) })
      .passthrough()
      .optional(),
    customer: z
      .object({
        id: z.string().min(1),
        email: z.string().optional(),
      })
      .passthrough()
      .optional(),
    // checkout.completed 事件中的 subscription 是嵌套对象
    subscription: z
      .union([z.string(), z.object({ id: z.string().min(1) }).passthrough()])
      .optional(),
    order: z
      .object({
        id: z.string().min(1),
        amount: z.number().int().nonnegative(),
        currency: z.string().min(1),
      })
      .passthrough()
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    current_period_start_date: z.string().optional(),
    current_period_end_date: z.string().optional(),
  }),
});

/** Creem Webhook 负载类型 */
export type CreemWebhookPayload = z.infer<typeof CreemWebhookSchema>;

/**
 * 订阅激活参数
 */
export interface SubscriptionActiveParams {
  subscriptionId: string;
  customerId: string;
  productId: string;
  userId: string;
  periodEnd: Date;
}

/**
 * 订阅取消参数
 */
export interface SubscriptionCanceledParams {
  subscriptionId: string;
  userId: string;
}

/**
 * 配额购买完成参数
 */
export interface QuotaPurchaseParams {
  checkoutId: string;
  orderId: string;
  userId: string;
  amount: number; // 购买的配额数量
  price: number; // 金额（分）
  currency: string;
}
