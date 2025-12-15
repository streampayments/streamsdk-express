/**
 * Basic Express.js Integration Example
 *
 * This example demonstrates the simplest way to integrate Stream payments
 * into an Express.js application using @streamsdk/express.
 *
 * Features:
 * - Simple checkout flow
 * - Basic webhook handling
 * - Payment completion tracking
 *
 * Usage:
 *   STREAM_API_KEY=your_api_key node examples/basic.mjs
 *
 * Then visit:
 *   http://localhost:3000/checkout?products=prod_xxx&customerPhone=%2B966501234567
 */

import express from 'express';
import { Checkout, Webhooks } from '@streamsdk/express';

const app = express();
const PORT = process.env.PORT || 3000;

// Required for webhook body parsing
app.use(express.json());

// Basic checkout route
// Example: /checkout?products=prod_123&customerPhone=%2B966501234567&customerName=Ahmad%20Ali
app.get('/checkout', Checkout({
  apiKey: process.env.STREAM_API_KEY,
  successUrl: `http://localhost:${PORT}/success`,
  returnUrl: `http://localhost:${PORT}/cancel`,
  defaultName: 'Store Checkout'
}));

// Success page
app.get('/success', (req, res) => {
  res.send(`
    <html>
      <head><title>Payment Successful</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: green;">✓ Payment Successful!</h1>
        <p>Your payment has been completed successfully.</p>
        <a href="/">Return to Home</a>
      </body>
    </html>
  `);
});

// Cancel page
app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <head><title>Payment Cancelled</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: orange;">Payment Cancelled</h1>
        <p>Your payment was cancelled.</p>
        <a href="/">Return to Home</a>
      </body>
    </html>
  `);
});

// Webhook handler
app.post('/webhooks/stream', Webhooks({
  apiKey: process.env.STREAM_API_KEY,

  onPaymentSucceeded: async (data) => {
    console.log('✓ Payment succeeded!');
    console.log('  Payment ID:', data.id);
    console.log('  Amount:', data.amount, data.currency);
    console.log('  Customer:', data.customer_name);

    // TODO: Update your database here
    // await db.orders.update({
    //   where: { paymentId: data.id },
    //   data: { status: 'paid' }
    // });
  },

  onPaymentFailed: async (data) => {
    console.log('✗ Payment failed!');
    console.log('  Payment ID:', data.id);
    console.log('  Reason:', data.failure_reason);

    // TODO: Handle failed payment
  }
}));

// Home page with simple form
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Stream Express Example</title></head>
      <body style="font-family: Arial; padding: 50px;">
        <h1>Stream Express.js Integration</h1>
        <p>Enter details to create a payment:</p>

        <form action="/checkout" method="GET">
          <div style="margin: 10px 0;">
            <label>Product ID:</label><br>
            <input type="text" name="products" placeholder="prod_xxx" required style="width: 300px; padding: 8px;">
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
            <label>Customer Email (optional):</label><br>
            <input type="email" name="customerEmail" placeholder="ahmad@example.com" style="width: 300px; padding: 8px;">
          </div>

          <div style="margin: 20px 0;">
            <button type="submit" style="padding: 10px 30px; background: #007bff; color: white; border: none; cursor: pointer; font-size: 16px;">
              Proceed to Checkout
            </button>
          </div>
        </form>

        <hr style="margin: 30px 0;">
        <h3>API Endpoints:</h3>
        <ul>
          <li><code>GET /checkout</code> - Checkout handler</li>
          <li><code>POST /webhooks/stream</code> - Webhook handler</li>
        </ul>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Stream Express.js Basic Example                         ║
╚══════════════════════════════════════════════════════════╝

Server running at: http://localhost:${PORT}

Endpoints:
  • Home:     http://localhost:${PORT}/
  • Checkout: http://localhost:${PORT}/checkout
  • Webhook:  http://localhost:${PORT}/webhooks/stream

Environment:
  ${process.env.STREAM_API_KEY ? '✓' : '✗'} STREAM_API_KEY ${process.env.STREAM_API_KEY ? 'is set' : 'is NOT set!'}

${!process.env.STREAM_API_KEY ? 'WARNING: Set STREAM_API_KEY environment variable!\n' : ''}Ready to accept payments!
  `);
});
