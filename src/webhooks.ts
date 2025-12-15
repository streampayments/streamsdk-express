import type { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookConfig, WebhookPayload } from './types';

/**
 * Creates an Express handler for Stream webhooks
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { Webhooks } from 'stream-sdk/express';
 *
 * const app = express();
 *
 * app.post('/webhooks/stream', express.json(), Webhooks({
 *   apiKey: process.env.STREAM_API_KEY!,
 *   webhookSecret: process.env.STREAM_WEBHOOK_SECRET,
 *   onPaymentSucceeded: async (data) => {
 *     console.log('Payment succeeded:', data);
 *     // Handle payment success
 *   },
 *   onInvoiceCreated: async (data) => {
 *     console.log('Invoice created:', data);
 *     // Handle invoice creation
 *   }
 * }));
 * ```
 */
export function Webhooks(config: WebhookConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify webhook signature if secret is provided
      if (config.webhookSecret) {
        const signatureHeader = req.headers['x-webhook-signature'] as string;

        if (!signatureHeader) {
          return res.status(401).json({
            error: 'Missing webhook signature'
          });
        }

        // Get raw body for signature verification
        const rawBody = JSON.stringify(req.body);
        const isValid = verifySignature(rawBody, signatureHeader, config.webhookSecret);

        if (!isValid) {
          return res.status(401).json({
            error: 'Invalid webhook signature'
          });
        }
      }

      const payload: WebhookPayload = req.body;
      const eventType = payload.event_type || payload.event || 'unknown';
      const data = payload.data || payload;

      // Route to specific event handlers based on Stream webhook events
      switch (eventType) {
        // Payment Events
        case 'PAYMENT_SUCCEEDED':
          if (config.onPaymentSucceeded) {
            await config.onPaymentSucceeded(data);
          }
          break;

        case 'PAYMENT_FAILED':
          if (config.onPaymentFailed) {
            await config.onPaymentFailed(data);
          }
          break;

        case 'PAYMENT_CANCELED':
          if (config.onPaymentCanceled) {
            await config.onPaymentCanceled(data);
          }
          break;

        case 'PAYMENT_REFUNDED':
          if (config.onPaymentRefunded) {
            await config.onPaymentRefunded(data);
          }
          break;

        case 'PAYMENT_MARKED_AS_PAID':
          if (config.onPaymentMarkedAsPaid) {
            await config.onPaymentMarkedAsPaid(data);
          }
          break;

        // Invoice Events
        case 'INVOICE_CREATED':
          if (config.onInvoiceCreated) {
            await config.onInvoiceCreated(data);
          }
          break;

        case 'INVOICE_SENT':
          if (config.onInvoiceSent) {
            await config.onInvoiceSent(data);
          }
          break;

        case 'INVOICE_ACCEPTED':
          if (config.onInvoiceAccepted) {
            await config.onInvoiceAccepted(data);
          }
          break;

        case 'INVOICE_REJECTED':
          if (config.onInvoiceRejected) {
            await config.onInvoiceRejected(data);
          }
          break;

        case 'INVOICE_COMPLETED':
          if (config.onInvoiceCompleted) {
            await config.onInvoiceCompleted(data);
          }
          break;

        case 'INVOICE_CANCELED':
          if (config.onInvoiceCanceled) {
            await config.onInvoiceCanceled(data);
          }
          break;

        case 'INVOICE_UPDATED':
          if (config.onInvoiceUpdated) {
            await config.onInvoiceUpdated(data);
          }
          break;

        // Subscription Events
        case 'SUBSCRIPTION_CREATED':
          if (config.onSubscriptionCreated) {
            await config.onSubscriptionCreated(data);
          }
          break;

        case 'SUBSCRIPTION_UPDATED':
          if (config.onSubscriptionUpdated) {
            await config.onSubscriptionUpdated(data);
          }
          break;

        case 'SUBSCRIPTION_CANCELED':
          if (config.onSubscriptionCanceled) {
            await config.onSubscriptionCanceled(data);
          }
          break;

        default:
          // Fall through to catch-all handler
          break;
      }

      // Call catch-all handler if provided
      if (config.onWebhook) {
        await config.onWebhook(eventType, data);
      }

      // Acknowledge receipt
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Verify webhook signature using HMAC-SHA256
 *
 * Stream webhook signature format: t={timestamp},v1={signature}
 * Signed content: "{timestamp}.{raw_request_body}"
 */
function verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    // Parse signature header: t=1234567890,v1=abcdef...
    const parts = signatureHeader.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.substring(2);
    const signature = parts.find(p => p.startsWith('v1='))?.substring(3);

    if (!timestamp || !signature) {
      return false;
    }

    // Check if timestamp is within 5 minutes (300 seconds) to prevent replay attacks
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - parseInt(timestamp);
    if (timeDiff > 300) {
      console.warn('Webhook signature timestamp too old:', timeDiff, 'seconds');
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}
