/**
 * TypeScript Express Application Example
 *
 * This example demonstrates type-safe integration with @streamsdk/express
 * using full TypeScript support.
 *
 * Features:
 * - Full TypeScript type safety
 * - Type-safe checkout configuration
 * - Type-safe webhook handlers
 * - Custom type definitions
 * - Async/await patterns
 *
 * Setup:
 *   npm install --save-dev @types/express @types/node typescript ts-node
 *
 * Usage:
 *   STREAM_API_KEY=your_api_key ts-node examples/typescript-app.ts
 */

import express, { Request, Response, NextFunction } from 'express';
import { Checkout, Webhooks } from '@streamsdk/express';
import type {
  CheckoutConfig,
  CheckoutQuery,
  WebhookConfig,
  WebhookPayload
} from '@streamsdk/express';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Order {
  id: string;
  productId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount?: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  paymentId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  createdAt: Date;
}

interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending';
  customerId?: string;
  metadata?: Record<string, any>;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

// =============================================================================
// DATABASE SIMULATION
// =============================================================================

class Database {
  private orders: Map<string, Order> = new Map();
  private customers: Map<string, Customer> = new Map();
  private payments: Map<string, PaymentRecord> = new Map();

  // Orders
  createOrder(order: Order): Order {
    this.orders.set(order.id, order);
    return order;
  }

  getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updated = { ...order, ...updates, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  listOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  // Customers
  createCustomer(customer: Customer): Customer {
    this.customers.set(customer.id, customer);
    return customer;
  }

  getCustomer(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  // Payments
  createPayment(payment: PaymentRecord): PaymentRecord {
    this.payments.set(payment.id, payment);
    return payment;
  }

  getPayment(id: string): PaymentRecord | undefined {
    return this.payments.get(id);
  }

  updatePayment(id: string, updates: Partial<PaymentRecord>): PaymentRecord | undefined {
    const payment = this.payments.get(id);
    if (!payment) return undefined;

    const updated = { ...payment, ...updates };
    this.payments.set(id, updated);
    return updated;
  }
}

const db = new Database();

// =============================================================================
// SERVICES
// =============================================================================

class OrderService {
  async createOrder(data: {
    productId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
  }): Promise<Order> {
    const order: Order = {
      id: `ORD-${Date.now()}`,
      productId: data.productId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      status: 'pending',
      createdAt: new Date()
    };

    return db.createOrder(order);
  }

  async markOrderAsPaid(orderId: string, paymentId: string): Promise<Order | undefined> {
    return db.updateOrder(orderId, {
      status: 'paid',
      paymentId,
      updatedAt: new Date()
    });
  }

  async markOrderAsFailed(orderId: string): Promise<Order | undefined> {
    return db.updateOrder(orderId, {
      status: 'failed',
      updatedAt: new Date()
    });
  }
}

class NotificationService {
  async sendPaymentConfirmation(data: {
    email?: string;
    customerName: string;
    amount: number;
    currency: string;
    orderId: string;
  }): Promise<void> {
    console.log('\n📧 Sending payment confirmation email');
    console.log(`   To: ${data.email}`);
    console.log(`   Customer: ${data.customerName}`);
    console.log(`   Amount: ${data.amount} ${data.currency}`);
    console.log(`   Order: ${data.orderId}`);

    // TODO: Implement actual email sending
    // await emailService.send({
    //   to: data.email,
    //   template: 'payment-confirmation',
    //   data
    // });
  }

  async sendPaymentFailure(data: {
    email?: string;
    customerName: string;
    reason: string;
  }): Promise<void> {
    console.log('\n📧 Sending payment failure notification');
    console.log(`   To: ${data.email}`);
    console.log(`   Reason: ${data.reason}`);
  }
}

const orderService = new OrderService();
const notificationService = new NotificationService();

// =============================================================================
// EXPRESS APP
// =============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// =============================================================================
// CHECKOUT CONFIGURATION
// =============================================================================

const checkoutConfig: CheckoutConfig = {
  apiKey: process.env.STREAM_API_KEY!,
  successUrl: `http://localhost:${PORT}/success`,
  returnUrl: `http://localhost:${PORT}/cancel`,
  defaultName: 'TypeScript Store Checkout'
};

// =============================================================================
// ROUTES
// =============================================================================

// Checkout route with order creation
app.get('/checkout/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { customerName, customerPhone, customerEmail } = req.query as CheckoutQuery;

    if (!customerName || !customerPhone) {
      return res.status(400).json({
        error: 'Missing required fields: customerName, customerPhone'
      });
    }

    // Create order in database
    const order = await orderService.createOrder({
      productId,
      customerName: customerName as string,
      customerPhone: customerPhone as string,
      customerEmail: customerEmail as string | undefined
    });

    console.log(`✓ Order created: ${order.id}`);

    // Add to request for checkout
    req.query.products = productId;
    req.query.metadata = JSON.stringify({
      orderId: order.id,
      source: 'typescript-app'
    });

    next();
  } catch (error) {
    next(error);
  }
}, Checkout(checkoutConfig));

// Multiple products checkout
app.get('/checkout', Checkout(checkoutConfig));

// =============================================================================
// WEBHOOK CONFIGURATION
// =============================================================================

const webhookConfig: WebhookConfig = {
  apiKey: process.env.STREAM_API_KEY!,
  webhookSecret: process.env.STREAM_WEBHOOK_SECRET,

  onPaymentSucceeded: async (data: any) => {
    console.log('\n✓ Payment Succeeded');
    console.log('  Payment ID:', data.id);
    console.log('  Amount:', data.amount, data.currency);

    try {
      // Parse metadata
      const metadata = typeof data.metadata === 'string'
        ? JSON.parse(data.metadata)
        : data.metadata || {};

      // Create payment record
      const payment: PaymentRecord = {
        id: data.id,
        orderId: metadata.orderId || '',
        amount: data.amount,
        currency: data.currency,
        status: 'completed',
        customerId: data.customer_id,
        metadata,
        completedAt: new Date()
      };

      db.createPayment(payment);

      // Update order if exists
      if (metadata.orderId) {
        const order = await orderService.markOrderAsPaid(metadata.orderId, data.id);
        if (order) {
          console.log(`  ✓ Order ${order.id} marked as paid`);

          // Send confirmation email
          await notificationService.sendPaymentConfirmation({
            email: data.customer_email,
            customerName: data.customer_name,
            amount: data.amount,
            currency: data.currency,
            orderId: metadata.orderId
          });
        }
      }
    } catch (error) {
      console.error('Error processing payment completed:', error);
      throw error;
    }
  },

  onPaymentFailed: async (data: any) => {
    console.log('\n✗ Payment Failed');
    console.log('  Payment ID:', data.id);
    console.log('  Reason:', data.failure_reason);

    try {
      const metadata = typeof data.metadata === 'string'
        ? JSON.parse(data.metadata)
        : data.metadata || {};

      // Update payment record
      const payment: PaymentRecord = {
        id: data.id,
        orderId: metadata.orderId || '',
        amount: data.amount || 0,
        currency: data.currency || 'SAR',
        status: 'failed',
        customerId: data.customer_id,
        metadata,
        failedAt: new Date(),
        failureReason: data.failure_reason
      };

      db.createPayment(payment);

      // Update order
      if (metadata.orderId) {
        await orderService.markOrderAsFailed(metadata.orderId);
      }

      // Send failure notification
      await notificationService.sendPaymentFailure({
        email: data.customer_email,
        customerName: data.customer_name,
        reason: data.failure_reason
      });
    } catch (error) {
      console.error('Error processing payment failed:', error);
      throw error;
    }
  },

  onWebhook: async (event: string, data: any) => {
    console.log(`\n📨 Webhook: ${event}`);
    // Log all events for audit
  }
};

app.post('/webhooks/stream', Webhooks(webhookConfig));

// =============================================================================
// API ROUTES
// =============================================================================

app.get('/api/orders', (req: Request, res: Response) => {
  const orders = db.listOrders();
  res.json({
    success: true,
    data: orders,
    total: orders.length
  });
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = db.getOrder(req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }

  res.json({
    success: true,
    data: order
  });
});

// =============================================================================
// UI ROUTES
// =============================================================================

app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>TypeScript Express Stream Integration</title></head>
      <body style="font-family: Arial; padding: 50px;">
        <h1>🔷 TypeScript Express Stream Integration</h1>
        <p>Type-safe payment processing with Stream SDK</p>

        <div style="margin: 30px 0;">
          <h2>Create Checkout</h2>
          <form action="/checkout/prod_example" method="GET">
            <div style="margin: 10px 0;">
              <label>Product ID:</label><br>
              <input type="text" name="products" value="prod_example" required style="width: 300px; padding: 8px;">
            </div>
            <div style="margin: 10px 0;">
              <label>Customer Name:</label><br>
              <input type="text" name="customerName" placeholder="Ahmad Ali" required style="width: 300px; padding: 8px;">
            </div>
            <div style="margin: 10px 0;">
              <label>Customer Phone:</label><br>
              <input type="text" name="customerPhone" placeholder="+966501234567" required style="width: 300px; padding: 8px;">
            </div>
            <div style="margin: 10px 0;">
              <label>Customer Email:</label><br>
              <input type="email" name="customerEmail" placeholder="ahmad@example.com" style="width: 300px; padding: 8px;">
            </div>
            <button type="submit" style="padding: 10px 30px; background: #007bff; color: white; border: none; cursor: pointer;">
              Proceed to Checkout
            </button>
          </form>
        </div>

        <div style="margin: 30px 0;">
          <h2>API Endpoints</h2>
          <ul>
            <li><a href="/api/orders">/api/orders</a> - List all orders</li>
            <li><code>GET /checkout/:productId</code> - Create checkout session</li>
            <li><code>POST /webhooks/stream</code> - Webhook handler</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

app.get('/success', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>Success</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: green;">✓ Payment Successful!</h1>
        <p>Your payment has been processed successfully.</p>
        <a href="/"><button style="padding: 10px 20px; cursor: pointer;">Back to Home</button></a>
      </body>
    </html>
  `);
});

app.get('/cancel', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>Cancelled</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: orange;">Payment Cancelled</h1>
        <a href="/"><button style="padding: 10px 20px; cursor: pointer;">Back to Home</button></a>
      </body>
    </html>
  `);
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  TypeScript Express Stream Integration                   ║
╚══════════════════════════════════════════════════════════╝

🔷 Server: http://localhost:${PORT}

📍 Endpoints:
  • Home:    http://localhost:${PORT}/
  • API:     http://localhost:${PORT}/api/orders
  • Webhook: http://localhost:${PORT}/webhooks/stream

🔧 Environment:
  ${process.env.STREAM_API_KEY ? '✓' : '✗'} STREAM_API_KEY

✨ Type-safe payment processing ready!
  `);
});

export { app, db, orderService, notificationService };
