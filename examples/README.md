# Stream SDK Express Examples

This directory contains comprehensive examples demonstrating how to integrate Stream payments into your Express.js applications using `@streamsdk/express`.

## 📁 Examples

### 1. **basic.mjs** - Getting Started

The simplest integration example. Perfect for beginners.

**Features:**
- Basic checkout handler
- Simple webhook processing
- Payment completion tracking
- Minimal setup

**Usage:**
```bash
cd examples
npm install
STREAM_API_KEY=your_api_key node basic.mjs
```

Then visit: `http://localhost:3000`

---

### 2. **comprehensive.mjs** - Advanced Integration

A complete example with all features and best practices.

**Features:**
- Single product checkout
- Multiple product cart checkout
- Subscription handling
- Database integration pattern
- Email notification system
- Complete webhook event handling
- Order/payment tracking
- Admin dashboard UI
- API endpoints

**Usage:**
```bash
STREAM_API_KEY=your_api_key node comprehensive.mjs
```

Then visit: `http://localhost:3000` for the dashboard

**Webhook Events Handled:**
- `payment.completed`
- `payment.failed`
- `subscription.created`
- `subscription.updated`
- `subscription.cancelled`
- `invoice.created`
- `invoice.paid`

---

### 3. **typescript-app.ts** - TypeScript Integration

Fully type-safe implementation with TypeScript.

**Features:**
- Full TypeScript type definitions
- Type-safe configuration
- Custom type definitions for orders, customers, payments
- Service layer pattern
- Async/await throughout
- Error handling with types

**Setup:**
```bash
npm install --save-dev typescript ts-node @types/node @types/express
```

**Usage:**
```bash
STREAM_API_KEY=your_api_key npx ts-node typescript-app.ts
```

---

## 🚀 Quick Start

### Installation

```bash
cd examples
npm install
```

### Environment Variables

Create a `.env` file in the examples directory:

```env
STREAM_API_KEY=your_stream_api_key_here
STREAM_WEBHOOK_SECRET=your_webhook_secret_here
PORT=3000
```

### Running Examples

```bash
# Basic example
npm run basic

# Comprehensive example
npm run comprehensive

# TypeScript example
npm run typescript
```

---

## 🔧 Configuration

All examples use the same basic configuration pattern:

### Checkout Configuration

```typescript
import { Checkout } from '@streamsdk/express';

app.get('/checkout', Checkout({
  apiKey: process.env.STREAM_API_KEY!,
  successUrl: 'https://yourapp.com/success',
  returnUrl: 'https://yourapp.com/cancel',
  defaultName: 'My Store Checkout'
}));
```

### Webhook Configuration

```typescript
import { Webhooks } from '@streamsdk/express';

app.post('/webhooks/stream', Webhooks({
  apiKey: process.env.STREAM_API_KEY!,
  webhookSecret: process.env.STREAM_WEBHOOK_SECRET,

  onPaymentCompleted: async (data) => {
    // Handle successful payment
  },

  onPaymentFailed: async (data) => {
    // Handle failed payment
  }
}));
```

---

## 📝 Common Patterns

### 1. Creating a Checkout Session

**Query Parameters:**
```
/checkout?products=prod_123&customerName=Ahmad&customerPhone=%2B966501234567
```

**With Multiple Products:**
```
/checkout?products=prod_123,prod_456,prod_789&customerId=cons_123
```

**With Metadata:**
```
/checkout?products=prod_123&metadata=%7B%22orderId%22%3A%22ORD-123%22%7D
```

### 2. Processing Webhooks

```typescript
onPaymentCompleted: async (data) => {
  // 1. Extract metadata
  const metadata = typeof data.metadata === 'string'
    ? JSON.parse(data.metadata)
    : data.metadata;

  // 2. Update your database
  await db.orders.update({
    where: { id: metadata.orderId },
    data: { status: 'paid', paymentId: data.id }
  });

  // 3. Send confirmation email
  await sendEmail({
    to: data.customer_email,
    subject: 'Payment Confirmed',
    template: 'confirmation',
    data: { amount: data.amount }
  });

  // 4. Trigger fulfillment
  await fulfillOrder(metadata.orderId);
}
```

### 3. Error Handling

```typescript
app.get('/checkout', Checkout(config));

app.use((err, req, res, next) => {
  console.error('Checkout error:', err);
  res.status(500).json({
    error: 'Failed to create checkout',
    message: err.message
  });
});
```

---

## 🧪 Testing

### Testing Webhooks Locally

Use [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Start your app
npm run basic

# In another terminal
ngrok http 3000
```

Then update your Stream webhook URL to:
```
https://your-ngrok-url.ngrok.io/webhooks/stream
```

### Testing Payments

1. Visit `http://localhost:3000/checkout?products=YOUR_PRODUCT_ID&customerPhone=%2B966501234567`
2. Complete the payment on Stream's checkout page
3. Check your console for webhook events
4. Verify database updates in your app

---

## 🏗️ Project Structure Examples

### Minimal Structure
```
your-app/
├── index.js          # Main app file
├── .env              # Environment variables
└── package.json
```

### Recommended Structure
```
your-app/
├── src/
│   ├── routes/
│   │   ├── checkout.js    # Checkout routes
│   │   └── webhooks.js    # Webhook handlers
│   ├── services/
│   │   ├── order.js       # Order management
│   │   ├── payment.js     # Payment processing
│   │   └── email.js       # Email notifications
│   ├── models/
│   │   ├── Order.js
│   │   └── Payment.js
│   └── app.js             # Express app setup
├── .env
└── package.json
```

---

## 📚 Resources

- **[@streamsdk/typescript Documentation](https://github.com/streampayments/streamsdk-typescript)**
- **[@streamsdk/express Documentation](https://github.com/streampayments/streamsdk-express)**
- **[Stream API Docs](https://docs.streampay.sa)**
- **[OpenAPI Spec](https://stream-app-service.streampay.sa/openapi.json)**

---

## 🆘 Support

If you encounter any issues:

1. Check the [GitHub Issues](https://github.com/streampayments/streamsdk-express/issues)
2. Email: support@streampay.sa
3. Read the main [README](../README.md)

---

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.
