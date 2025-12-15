# stream-sdk-express

<div align="center">
  <img src="https://streampay.sa/logo.png" alt="StreamPay Logo" width="200"/>

  Express.js adapter for Stream SDK - Declarative handlers for checkout and webhooks

  [![npm version](https://img.shields.io/npm/v/stream-sdk-express.svg)](https://www.npmjs.com/package/stream-sdk-express)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
</div>

---

## 📚 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Features](#features)
- [Usage](#usage)
  - [Checkout Handler](#checkout-handler)
  - [Webhook Handler](#webhook-handler)
  - [Advanced Usage](#advanced-usage)
- [Configuration](#configuration)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

---

## Overview

The Stream SDK Express adapter provides a clean, declarative way to integrate StreamPay payments into your Express.js applications. Built on top of [stream-sdk](https://github.com/streampayments/stream-sdk), it offers drop-in handlers for checkout flows and webhook processing.

**Key Benefits:**
- 🚀 **Simple Integration** - Add payment processing in minutes
- 🔒 **Type-Safe** - Full TypeScript support with type definitions
- 🎯 **Event-Driven** - Clean event handlers for webhook processing
- 🔄 **Flexible** - Supports guest and authenticated checkout flows
- 📦 **Lightweight** - Minimal dependencies (~7KB)
- 🔗 **Auto-Updates** - Inherits stream-sdk updates automatically

---

## Installation

### NPM (Coming Soon)

```bash
npm install stream-sdk-express
```

### GitHub

```bash
npm install github:streampayments/stream-sdk-express#v1.0.0
```

**Note:** This package requires [stream-sdk](https://github.com/streampayments/stream-sdk) as a dependency, which will be installed automatically.

---

## Quick Start

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
    // Update database, send emails, etc.
  }
}));

app.listen(3000);
```

**Usage:**
```
/checkout?products=prod_123&customerPhone=%2B966501234567&customerName=Ahmad%20Ali
```

---

## Features

- 🚀 **Drop-in Handlers** - Simple Express middleware
- 🔒 **Secure** - HMAC-SHA256 webhook signature verification
- 🎯 **Event Routing** - Specific handlers for each event type
- 🔄 **Auto Resource Management** - Consumer and product creation/lookup
- 📝 **Full TypeScript** - Complete type definitions
- ⚡ **Fast** - Lightweight with minimal overhead
- 🛡️ **Production Ready** - Error handling and validation built-in

---

## Usage

### Checkout Handler

The `Checkout` handler creates payment links and redirects users to the StreamPay checkout page.

#### Basic Example

```typescript
import { Checkout } from 'stream-sdk-express';

app.get('/checkout', Checkout({
  apiKey: process.env.STREAM_API_KEY!,
  successUrl: 'https://myapp.com/payment/success',
  returnUrl: 'https://myapp.com/payment/cancelled',
  defaultName: 'My Store Checkout'
}));
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `products` | string | Yes | Product ID(s), comma-separated for multiple |
| `name` | string | No | Custom name for payment link (overrides defaultName) |
| `customerId` | string | No | Existing customer/consumer ID |
| `customerEmail` | string | No | Customer email for new customers |
| `customerName` | string | No | Customer name for new customers |
| `customerPhone` | string | No | Customer phone for new customers |
| `metadata` | string | No | URL-encoded JSON metadata |

#### Usage Examples

**Single Product with New Customer:**
```
/checkout?products=prod_123&customerPhone=%2B966501234567&customerName=Mohammad%20Ahmad
```

**Multiple Products:**
```
/checkout?products=prod_123,prod_456&customerId=cons_789
```

**With Metadata:**
```
/checkout?products=prod_123&metadata=%7B%22orderId%22%3A%22ORD-123%22%7D
```

---

### Webhook Handler

The `Webhooks` handler processes webhook events from StreamPay.

#### Basic Example

```typescript
import { Webhooks } from 'stream-sdk-express';

app.post('/webhooks/stream', Webhooks({
  apiKey: process.env.STREAM_API_KEY!,
  webhookSecret: process.env.STREAM_WEBHOOK_SECRET,

  onPaymentCompleted: async (data) => {
    // Update your database
    await db.orders.update({
      where: { paymentId: data.id },
      data: { status: 'paid', paidAt: new Date() }
    });

    // Send confirmation email
    await sendEmail({
      to: data.customer_email,
      subject: 'Payment Confirmed',
      template: 'payment-confirmation',
      data: { amount: data.amount, orderId: data.metadata?.orderId }
    });
  },

  onPaymentFailed: async (data) => {
    console.log('Payment failed:', data.failure_reason);
    // Handle failed payment
  }
}));
```

#### Supported Events

| Event | Handler | Description |
|-------|---------|-------------|
| `payment.created` | `onPaymentCreated` | Payment link created |
| `payment.completed` | `onPaymentCompleted` | Payment successfully processed |
| `payment.paid` | `onPaymentCompleted` | Payment successfully processed |
| `payment.failed` | `onPaymentFailed` | Payment failed |
| `subscription.created` | `onSubscriptionCreated` | New subscription created |
| `subscription.updated` | `onSubscriptionUpdated` | Subscription modified |
| `subscription.cancelled` | `onSubscriptionCancelled` | Subscription cancelled |
| `invoice.created` | `onInvoiceCreated` | Invoice generated |
| `invoice.paid` | `onInvoicePaid` | Invoice payment received |

#### Catch-All Handler

Use `onWebhook` to handle all events:

```typescript
app.post('/webhooks/stream', Webhooks({
  apiKey: process.env.STREAM_API_KEY!,

  onWebhook: async (event, data) => {
    console.log(`Webhook: ${event}`, data);
    await logWebhookEvent(event, data);
  }
}));
```

---

### Advanced Usage

#### Custom Error Handling

```typescript
app.get('/checkout', Checkout({
  apiKey: process.env.STREAM_API_KEY!,
  successUrl: 'https://myapp.com/success',
  returnUrl: 'https://myapp.com/cancel'
}));

// Add error handler after checkout route
app.use((error, req, res, next) => {
  console.error('Checkout error:', error);
  res.status(500).json({
    error: 'Failed to create checkout session',
    message: error.message
  });
});
```

#### Dynamic Configuration

```typescript
app.get('/checkout/:tier', (req, res, next) => {
  const { tier } = req.params;

  // Get product ID based on tier
  const productId = getProductIdForTier(tier);

  // Add product to query
  req.query.products = productId;

  next();
}, Checkout({
  apiKey: process.env.STREAM_API_KEY!,
  successUrl: `https://myapp.com/success?tier=${req.params.tier}`,
  returnUrl: 'https://myapp.com/cancel'
}));
```

#### Testing Webhooks Locally

Use [ngrok](https://ngrok.com/) to expose your local webhook endpoint:

```bash
# Start ngrok
ngrok http 3000

# Update your Stream webhook URL to:
# https://your-ngrok-url.ngrok.io/webhooks/stream
```

---

## Configuration

### CheckoutConfig

```typescript
interface CheckoutConfig {
  apiKey: string;           // Stream API key (required)
  successUrl: string;       // Redirect URL after successful payment (required)
  returnUrl?: string;       // Redirect URL on cancellation (optional)
  baseUrl?: string;         // Custom Stream API base URL (optional)
  defaultName?: string;     // Default name for payment links (optional)
}
```

### WebhookConfig

```typescript
interface WebhookConfig {
  apiKey: string;
  webhookSecret?: string;   // For signature verification (recommended)

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

---

## Examples

See the usage examples throughout this README for common patterns:

- [Quick Start](#quick-start) - Basic setup
- [Checkout Handler](#checkout-handler) - Payment link creation
- [Webhook Handler](#webhook-handler) - Event processing
- [Advanced Usage](#advanced-usage) - Custom configurations

---

## Best Practices

1. **Always use HTTPS in production** for webhook endpoints
2. **Validate webhook signatures** using the `webhookSecret` option
3. **Handle webhook failures gracefully** with retry logic
4. **Use idempotency keys** in your webhook handlers to prevent duplicate processing
5. **Log all webhook events** for debugging and audit purposes
6. **Return 200 OK quickly** from webhook handlers (process async operations in background)

---

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

---

## API Reference

### Checkout(config: CheckoutConfig)

Creates an Express middleware that handles checkout requests.

**Returns:** Express middleware function

### Webhooks(config: WebhookConfig)

Creates an Express middleware that processes webhook events.

**Returns:** Express middleware function

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/streampayments/stream-sdk-express.git
cd stream-sdk-express

# Install dependencies
npm install

# Build the adapter
npm run build

# Run tests
npm test
```

---

## Support

### Documentation

- **[Stream SDK Documentation](https://github.com/streampayments/stream-sdk)**
- **[API Documentation](https://docs.streampay.sa/)**
- **[OpenAPI Specification](https://stream-app-service.streampay.sa/openapi.json)**

### Help & Issues

- **📧 Email:** support@streampay.sa
- **🐛 Issues:** [GitHub Issues](https://github.com/streampayments/stream-sdk-express/issues)
- **💬 Discussions:** [GitHub Discussions](https://github.com/streampayments/stream-sdk-express/discussions)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Made with ❤️ by <a href="https://streampay.sa">StreamPay</a></p>
  <p>
    <a href="https://streampay.sa">Website</a> •
    <a href="https://docs.streampay.sa">Documentation</a> •
    <a href="https://github.com/streampayments">GitHub</a>
  </p>
</div>
