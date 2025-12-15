/**
 * Comprehensive Express.js Integration Example
 *
 * This example demonstrates advanced features of @streamsdk/express:
 * - Multiple webhook event handlers
 * - Custom error handling
 * - Metadata tracking
 * - Database integration pattern
 * - Email notification pattern
 * - Subscription and invoice handling
 *
 * Usage:
 *   STREAM_API_KEY=your_api_key node examples/comprehensive.mjs
 */

import express from 'express';
import { Checkout, Webhooks } from '@streamsdk/express';

const app = express();
const PORT = process.env.PORT || 3000;

// Simulated database
const db = {
  orders: new Map(),
  payments: new Map(),
  subscriptions: new Map(),
  invoices: new Map()
};

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// CHECKOUT ROUTES
// =============================================================================

// Single product checkout
app.get('/checkout/product/:productId', (req, res, next) => {
  const { productId } = req.params;
  const { customerName, customerPhone, customerEmail } = req.query;

  // Create order in database
  const orderId = `ORD-${Date.now()}`;
  db.orders.set(orderId, {
    id: orderId,
    productId,
    customerName,
    customerPhone,
    customerEmail,
    status: 'pending',
    createdAt: new Date()
  });

  // Add metadata to track order
  req.query.products = productId;
  req.query.metadata = JSON.stringify({ orderId, source: 'web' });

  next();
}, Checkout({
  apiKey: process.env.STREAM_API_KEY,
  successUrl: `http://localhost:${PORT}/success`,
  returnUrl: `http://localhost:${PORT}/cancel`,
  defaultName: 'Product Checkout'
}));

// Multiple products checkout (shopping cart)
app.get('/checkout/cart', (req, res, next) => {
  const { products, customerName, customerPhone, customerEmail } = req.query;

  if (!products) {
    return res.status(400).json({ error: 'Products are required' });
  }

  // Create cart order
  const orderId = `CART-${Date.now()}`;
  db.orders.set(orderId, {
    id: orderId,
    productIds: products.split(','),
    customerName,
    customerPhone,
    customerEmail,
    status: 'pending',
    createdAt: new Date()
  });

  req.query.metadata = JSON.stringify({ orderId, type: 'cart', source: 'web' });

  next();
}, Checkout({
  apiKey: process.env.STREAM_API_KEY,
  successUrl: `http://localhost:${PORT}/success`,
  returnUrl: `http://localhost:${PORT}/cancel`,
  defaultName: 'Shopping Cart Checkout'
}));

// Subscription checkout
app.get('/checkout/subscribe/:tier', (req, res, next) => {
  const { tier } = req.params;

  // Map tier to product ID
  const productMap = {
    basic: process.env.BASIC_PRODUCT_ID,
    premium: process.env.PREMIUM_PRODUCT_ID,
    enterprise: process.env.ENTERPRISE_PRODUCT_ID
  };

  const productId = productMap[tier];
  if (!productId) {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  const subscriptionId = `SUB-${Date.now()}`;
  db.subscriptions.set(subscriptionId, {
    id: subscriptionId,
    tier,
    productId,
    status: 'pending',
    createdAt: new Date()
  });

  req.query.products = productId;
  req.query.metadata = JSON.stringify({ subscriptionId, tier, type: 'subscription' });

  next();
}, Checkout({
  apiKey: process.env.STREAM_API_KEY,
  successUrl: `http://localhost:${PORT}/success?type=subscription`,
  returnUrl: `http://localhost:${PORT}/cancel`,
  defaultName: 'Subscription Checkout'
}));

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

app.post('/webhooks/stream', Webhooks({
  apiKey: process.env.STREAM_API_KEY,
  webhookSecret: process.env.STREAM_WEBHOOK_SECRET,

  // Payment succeeded
  onPaymentSucceeded: async (data) => {
    console.log('\n✓ Payment Succeeded Event');
    console.log('  Payment ID:', data.id);
    console.log('  Amount:', data.amount, data.currency);
    console.log('  Customer:', data.customer_name, data.customer_email);

    // Extract metadata
    const metadata = typeof data.metadata === 'string'
      ? JSON.parse(data.metadata)
      : data.metadata;

    if (metadata?.orderId) {
      // Update order in database
      const order = db.orders.get(metadata.orderId);
      if (order) {
        order.status = 'paid';
        order.paymentId = data.id;
        order.paidAt = new Date();
        db.orders.set(metadata.orderId, order);

        console.log('  ✓ Order updated:', metadata.orderId);
      }
    }

    if (metadata?.subscriptionId) {
      // Activate subscription
      const subscription = db.subscriptions.get(metadata.subscriptionId);
      if (subscription) {
        subscription.status = 'active';
        subscription.activatedAt = new Date();
        db.subscriptions.set(metadata.subscriptionId, subscription);

        console.log('  ✓ Subscription activated:', metadata.subscriptionId);
      }
    }

    // Save payment record
    db.payments.set(data.id, {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      status: 'completed',
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      metadata,
      completedAt: new Date()
    });

    // Send confirmation email (simulated)
    await sendConfirmationEmail({
      to: data.customer_email,
      customerName: data.customer_name,
      amount: data.amount,
      currency: data.currency,
      orderId: metadata?.orderId
    });
  },

  // Payment failed
  onPaymentFailed: async (data) => {
    console.log('\n✗ Payment Failed Event');
    console.log('  Payment ID:', data.id);
    console.log('  Reason:', data.failure_reason);

    const metadata = typeof data.metadata === 'string'
      ? JSON.parse(data.metadata)
      : data.metadata;

    if (metadata?.orderId) {
      const order = db.orders.get(metadata.orderId);
      if (order) {
        order.status = 'failed';
        order.failureReason = data.failure_reason;
        order.failedAt = new Date();
        db.orders.set(metadata.orderId, order);

        console.log('  ✓ Order marked as failed:', metadata.orderId);
      }
    }

    // Send failure notification (simulated)
    await sendFailureEmail({
      to: data.customer_email,
      customerName: data.customer_name,
      reason: data.failure_reason
    });
  },

  // Subscription events
  onSubscriptionCreated: async (data) => {
    console.log('\n✓ Subscription Created');
    console.log('  Subscription ID:', data.id);
    console.log('  Customer:', data.customer_id);

    db.subscriptions.set(data.id, {
      id: data.id,
      customerId: data.customer_id,
      status: 'active',
      billingCycle: data.billing_cycle,
      createdAt: new Date()
    });
  },

  onSubscriptionUpdated: async (data) => {
    console.log('\n↻ Subscription Updated');
    console.log('  Subscription ID:', data.id);
    console.log('  Status:', data.status);

    const subscription = db.subscriptions.get(data.id);
    if (subscription) {
      subscription.status = data.status;
      subscription.updatedAt = new Date();
      db.subscriptions.set(data.id, subscription);
    }
  },

  onSubscriptionCanceled: async (data) => {
    console.log('\n✗ Subscription Cancelled');
    console.log('  Subscription ID:', data.id);
    console.log('  Cancelled at:', data.cancelled_at);

    const subscription = db.subscriptions.get(data.id);
    if (subscription) {
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date(data.cancelled_at);
      db.subscriptions.set(data.id, subscription);
    }
  },

  // Invoice events
  onInvoiceCreated: async (data) => {
    console.log('\n✓ Invoice Created');
    console.log('  Invoice ID:', data.id);
    console.log('  Amount:', data.total_amount);

    db.invoices.set(data.id, {
      id: data.id,
      customerId: data.customer_id,
      amount: data.total_amount,
      status: 'pending',
      dueDate: data.due_date,
      createdAt: new Date()
    });
  },

  onInvoiceCompleted: async (data) => {
    console.log('\n✓ Invoice Paid');
    console.log('  Invoice ID:', data.id);
    console.log('  Paid at:', data.paid_at);

    const invoice = db.invoices.get(data.id);
    if (invoice) {
      invoice.status = 'paid';
      invoice.paidAt = new Date(data.paid_at);
      db.invoices.set(data.id, invoice);
    }
  },

  // Catch-all webhook handler
  onWebhook: async (event, data) => {
    console.log(`\n📨 Webhook Event: ${event}`);
    console.log('  Data:', JSON.stringify(data, null, 2));

    // Log all webhook events for audit
    // await auditLog.create({ event, data, receivedAt: new Date() });
  }
}));

// =============================================================================
// UI ROUTES
// =============================================================================

app.get('/', (req, res) => {
  const orders = Array.from(db.orders.values());
  const payments = Array.from(db.payments.values());
  const subscriptions = Array.from(db.subscriptions.values());

  res.send(`
    <html>
      <head>
        <title>Stream Express - Comprehensive Example</title>
        <style>
          body { font-family: Arial; padding: 30px; max-width: 1200px; margin: 0 auto; }
          h1 { color: #333; }
          .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
          button:hover { background: #0056b3; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .status.paid { background: #d4edda; color: #155724; }
          .status.pending { background: #fff3cd; color: #856404; }
          .status.failed { background: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <h1>🛍️ Stream Express - Comprehensive Example</h1>

        <div class="grid">
          <div class="section">
            <h2>Single Product Checkout</h2>
            <form action="/checkout/product/prod_123" method="GET">
              <input type="text" name="customerName" placeholder="Customer Name" required style="width: 100%; padding: 8px; margin: 5px 0;"><br>
              <input type="tel" name="customerPhone" placeholder="+966501234567" required style="width: 100%; padding: 8px; margin: 5px 0;"><br>
              <input type="email" name="customerEmail" placeholder="email@example.com" style="width: 100%; padding: 8px; margin: 5px 0;"><br>
              <button type="submit" style="margin-top: 10px;">Checkout Product</button>
            </form>
          </div>

          <div class="section">
            <h2>Cart Checkout</h2>
            <form action="/checkout/cart" method="GET">
              <input type="text" name="products" placeholder="prod_123,prod_456" required style="width: 100%; padding: 8px; margin: 5px 0;"><br>
              <input type="text" name="customerName" placeholder="Customer Name" required style="width: 100%; padding: 8px; margin: 5px 0;"><br>
              <input type="tel" name="customerPhone" placeholder="+966501234567" required style="width: 100%; padding: 8px; margin: 5px 0;"><br>
              <button type="submit" style="margin-top: 10px;">Checkout Cart</button>
            </form>
          </div>
        </div>

        <div class="section">
          <h2>Subscription Tiers</h2>
          <div style="display: flex; gap: 15px;">
            <a href="/checkout/subscribe/basic?customerName=Test&customerPhone=%2B966501234567">
              <button>Basic Plan</button>
            </a>
            <a href="/checkout/subscribe/premium?customerName=Test&customerPhone=%2B966501234567">
              <button>Premium Plan</button>
            </a>
            <a href="/checkout/subscribe/enterprise?customerName=Test&customerPhone=%2B966501234567">
              <button>Enterprise Plan</button>
            </a>
          </div>
        </div>

        <div class="section">
          <h2>📊 Orders (${orders.length})</h2>
          ${orders.length > 0 ? `
            <table>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
              ${orders.map(order => `
                <tr>
                  <td>${order.id}</td>
                  <td>${order.customerName}</td>
                  <td><span class="status ${order.status}">${order.status}</span></td>
                  <td>${order.createdAt.toLocaleString()}</td>
                </tr>
              `).join('')}
            </table>
          ` : '<p>No orders yet</p>'}
        </div>

        <div class="section">
          <h2>💳 Payments (${payments.length})</h2>
          ${payments.length > 0 ? `
            <table>
              <tr>
                <th>Payment ID</th>
                <th>Amount</th>
                <th>Customer</th>
                <th>Status</th>
              </tr>
              ${payments.map(payment => `
                <tr>
                  <td>${payment.id}</td>
                  <td>${payment.amount} ${payment.currency}</td>
                  <td>${payment.customerName}</td>
                  <td><span class="status ${payment.status}">${payment.status}</span></td>
                </tr>
              `).join('')}
            </table>
          ` : '<p>No payments yet</p>'}
        </div>

        <div class="section">
          <h2>🔄 Subscriptions (${subscriptions.length})</h2>
          ${subscriptions.length > 0 ? `
            <table>
              <tr>
                <th>Subscription ID</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
              ${subscriptions.map(sub => `
                <tr>
                  <td>${sub.id}</td>
                  <td>${sub.tier || 'N/A'}</td>
                  <td><span class="status ${sub.status}">${sub.status}</span></td>
                  <td>${sub.createdAt.toLocaleString()}</td>
                </tr>
              `).join('')}
            </table>
          ` : '<p>No subscriptions yet</p>'}
        </div>
      </body>
    </html>
  `);
});

app.get('/success', (req, res) => {
  const { type } = req.query;
  const message = type === 'subscription'
    ? 'Your subscription is now active!'
    : 'Your payment has been completed successfully.';

  res.send(`
    <html>
      <head><title>Success</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: green;">✓ Success!</h1>
        <p>${message}</p>
        <a href="/"><button>Return to Dashboard</button></a>
      </body>
    </html>
  `);
});

app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <head><title>Cancelled</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: orange;">Payment Cancelled</h1>
        <p>Your payment was cancelled.</p>
        <a href="/"><button>Return to Dashboard</button></a>
      </body>
    </html>
  `);
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

app.get('/api/orders', (req, res) => {
  res.json({
    orders: Array.from(db.orders.values()),
    total: db.orders.size
  });
});

app.get('/api/payments', (req, res) => {
  res.json({
    payments: Array.from(db.payments.values()),
    total: db.payments.size
  });
});

app.get('/api/subscriptions', (req, res) => {
  res.json({
    subscriptions: Array.from(db.subscriptions.values()),
    total: db.subscriptions.size
  });
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function sendConfirmationEmail({ to, customerName, amount, currency, orderId }) {
  console.log(`\n📧 Sending confirmation email to ${to}`);
  console.log(`   Subject: Payment Confirmation - Order ${orderId}`);
  console.log(`   Amount: ${amount} ${currency}`);

  // TODO: Implement actual email sending
  // await emailService.send({
  //   to,
  //   subject: `Payment Confirmation - Order ${orderId}`,
  //   template: 'payment-confirmation',
  //   data: { customerName, amount, currency, orderId }
  // });
}

async function sendFailureEmail({ to, customerName, reason }) {
  console.log(`\n📧 Sending failure notification to ${to}`);
  console.log(`   Reason: ${reason}`);

  // TODO: Implement actual email sending
}

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Stream Express.js - Comprehensive Example               ║
╚══════════════════════════════════════════════════════════╝

Server running at: http://localhost:${PORT}

📍 Endpoints:
  • Dashboard:     http://localhost:${PORT}/
  • Checkout:      http://localhost:${PORT}/checkout/product/:id
  • Cart:          http://localhost:${PORT}/checkout/cart
  • Subscribe:     http://localhost:${PORT}/checkout/subscribe/:tier
  • Webhook:       http://localhost:${PORT}/webhooks/stream

📊 API:
  • Orders:        http://localhost:${PORT}/api/orders
  • Payments:      http://localhost:${PORT}/api/payments
  • Subscriptions: http://localhost:${PORT}/api/subscriptions

🔧 Environment:
  ${process.env.STREAM_API_KEY ? '✓' : '✗'} STREAM_API_KEY
  ${process.env.STREAM_WEBHOOK_SECRET ? '✓' : '✗'} STREAM_WEBHOOK_SECRET (recommended)

${!process.env.STREAM_API_KEY ? '\n⚠️  WARNING: Set STREAM_API_KEY environment variable!\n' : ''}Ready!
  `);
});
