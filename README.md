# stream-sdk-express

Express.js adapter for Stream SDK - Declarative handlers for checkout and webhooks.

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Features

- 🚀 **Simple Integration** - Drop-in handlers for checkout and webhooks
- 🔒 **Type-Safe** - Full TypeScript support with type definitions
- 🎯 **Event-Driven** - Clean event handlers for webhook processing
- 🔄 **Flexible** - Supports both guest and authenticated checkout flows
- 📦 **Lightweight** - Minimal dependencies, peer dependency on Express
- 🔗 **Built on stream-sdk** - Automatic updates when core SDK changes

## Installation

```bash
npm install stream-sdk-express
```

**Note:** This package requires [stream-sdk](https://github.com/streampayments/stream-sdk) as a dependency, which will be installed automatically.

## Quick Start

### Basic Setup

```typescript
import express from 'express';
import { Checkout, Webhooks } from 'stream-sdk-express';

const app = express();
app.use(express.json());

// Checkout handler
app.get('/checkout', Checkout({
  apiKey: process.env.STREAM_API_KEY!,
  successUrl: 'https://myapp.com/success',
  returnUrl: 'https://myapp.com/cancel'
}));

// Webhook handler
app.post('/webhooks/stream', Webhooks({
  apiKey: process.env.STREAM_API_KEY!,
  onPaymentCompleted: async (data) => {
    console.log('Payment completed:', data);
  }
}));

app.listen(3000);
```

## Checkout Handler

The `Checkout` handler creates payment links and redirects users to the Stream checkout page.

### Configuration

```typescript
interface CheckoutConfig {
  apiKey: string;           // Stream API key (required)
  successUrl: string;       // Redirect URL after successful payment (required)
  returnUrl?: string;       // Redirect URL on cancellation (optional)
  baseUrl?: string;         // Custom Stream API base URL (optional)
  defaultName?: string;     // Default name for payment links (optional)
}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `products` | string | Yes | Product ID(s), comma-separated for multiple |
| `name` | string | No | Custom name for payment link (overrides defaultName) |
| `customerId` | string | No | Existing customer/consumer ID |
| `customerEmail` | string | No | Customer email for new customers |
| `customerName` | string | No | Customer name for new customers |
| `customerPhone` | string | No | Customer phone for new customers |
| `metadata` | string | No | URL-encoded JSON metadata |

### Example

```typescript
import { Checkout } from 'stream-sdk-express';

app.get('/checkout', Checkout({
  apiKey: process.env.STREAM_API_KEY!,
  successUrl: 'https://myapp.com/payment/success',
  returnUrl: 'https://myapp.com/payment/cancelled',
  defaultName: 'My Store Checkout'
}));
```

**Usage:**
```
/checkout?products=prod_123&customerPhone=%2B966501234567&customerName=Mohammad%20Ahmad
```

## Webhook Handler

The `Webhooks` handler processes webhook events from Stream.

### Configuration

```typescript
interface WebhookConfig {
  apiKey: string;
  webhookSecret?: string;

  // Specific event handlers
  onPaymentCreated?: (data: any) => void | Promise<void>;
  onPaymentCompleted?: (data: any) => void | Promise<void>;
  onPaymentFailed?: (data: any) => void | Promise<void>;
  onSubscriptionCreated?: (data: any) => void | Promise<void>;
  onSubscriptionUpdated?: (data: any) => void | Promise<void>;
  onSubscriptionCancelled?: (data: any) => void | Promise<void>;
  onInvoiceCreated?: (data: any) => void | Promise<void>;
  onInvoicePaid?: (data: any) => void | Promise<void>;

  // Catch-all handler
  onWebhook?: (event: string, data: any) => void | Promise<void>;
}
```

### Supported Events

- `payment.created` - Payment link created
- `payment.completed` / `payment.paid` - Payment successfully processed
- `payment.failed` - Payment failed
- `subscription.created` - New subscription created
- `subscription.updated` - Subscription modified
- `subscription.cancelled` - Subscription cancelled
- `invoice.created` - Invoice generated
- `invoice.paid` - Invoice payment received

### Example

```typescript
import { Webhooks } from 'stream-sdk-express';

app.post('/webhooks/stream', Webhooks({
  apiKey: process.env.STREAM_API_KEY!,
  webhookSecret: process.env.STREAM_WEBHOOK_SECRET,

  onPaymentCompleted: async (data) => {
    console.log('Payment completed!');

    // Update your database
    await db.orders.update({
      where: { paymentId: data.id },
      data: { status: 'paid' }
    });

    // Send confirmation email
    await sendEmail({
      to: data.customer_email,
      subject: 'Payment Confirmed'
    });
  },

  onPaymentFailed: async (data) => {
    console.log('Payment failed:', data.failure_reason);
  }
}));
```

## Best Practices

1. **Always use HTTPS in production** for webhook endpoints
2. **Validate webhook signatures** using the `webhookSecret` option
3. **Handle webhook failures gracefully** with retry logic
4. **Use idempotency keys** in your webhook handlers to prevent duplicate processing
5. **Log all webhook events** for debugging and audit purposes
6. **Return 200 OK quickly** from webhook handlers (process async operations in background)

## TypeScript Support

The adapter is fully typed and exports all necessary types:

```typescript
import type {
  CheckoutConfig,
  CheckoutQuery,
  CheckoutRequest,
  WebhookConfig,
  WebhookPayload
} from 'stream-sdk-express';
```

## Related Packages

- **[stream-sdk](https://github.com/streampayments/stream-sdk)** - Core TypeScript SDK for Stream API
- More adapters coming soon (Fastify, Next.js, etc.)

## Documentation

- [Stream SDK Documentation](https://github.com/streampayments/stream-sdk)
- [Stream API Docs](https://docs.streampay.sa/)

## Support

- 📧 Email: support@streampay.sa
- 🐛 Issues: [GitHub Issues](https://github.com/streampayments/stream-sdk-express/issues)

## License

MIT
