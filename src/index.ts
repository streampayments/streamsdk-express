/**
 * Stream SDK Express Adapter
 *
 * Provides Express.js handlers for Stream payment flows.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { Checkout, Webhooks } from 'stream-sdk/express';
 *
 * const app = express();
 *
 * // Checkout handler - redirects to Stream payment page
 * app.get('/checkout', Checkout({
 *   apiKey: process.env.STREAM_API_KEY!,
 *   successUrl: 'https://myapp.com/success',
 *   returnUrl: 'https://myapp.com/cancel'
 * }));
 *
 * // Webhook handler - processes Stream webhook events
 * app.post('/webhooks/stream', express.json(), Webhooks({
 *   apiKey: process.env.STREAM_API_KEY!,
 *   onPaymentCompleted: async (data) => {
 *     console.log('Payment completed:', data);
 *   }
 * }));
 * ```
 */

export { Checkout } from './checkout';
export { Webhooks } from './webhooks';
export type {
  CheckoutConfig,
  CheckoutQuery,
  CheckoutRequest,
  WebhookConfig,
  WebhookPayload
} from './types';
