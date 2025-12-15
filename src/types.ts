import type { Request } from 'express';

/**
 * Configuration for the Checkout handler
 */
export interface CheckoutConfig {
  /**
   * Stream API key for authentication
   */
  apiKey: string;

  /**
   * URL to redirect to after successful payment
   */
  successUrl: string;

  /**
   * URL to redirect to if payment fails or is cancelled
   */
  returnUrl?: string;

  /**
   * Base URL for Stream API (defaults to production)
   */
  baseUrl?: string;

  /**
   * Default name for payment links (optional)
   * If not provided, uses "Checkout {timestamp}"
   * Can be overridden via query parameter: ?name=Custom+Name
   */
  defaultName?: string;
}

/**
 * Query parameters for checkout
 */
export interface CheckoutQuery {
  /**
   * Product ID(s) to include in checkout
   * Can be a single ID or comma-separated list
   */
  products?: string;

  /**
   * Custom name for the payment link (optional)
   * Overrides defaultName from config
   */
  name?: string;

  /**
   * Customer ID (consumer ID in Stream)
   */
  customerId?: string;

  /**
   * Customer email
   */
  customerEmail?: string;

  /**
   * Customer name
   */
  customerName?: string;

  /**
   * Customer phone number
   */
  customerPhone?: string;

  /**
   * Additional metadata as URL-encoded JSON
   */
  metadata?: string;
}

/**
 * Configuration for the Webhook handler
 */
export interface WebhookConfig {
  /**
   * Stream API key for authentication
   */
  apiKey: string;

  /**
   * Webhook secret for signature verification
   * Required for production use to verify webhook authenticity
   */
  webhookSecret?: string;

  /**
   * Payment Event Handlers
   */
  onPaymentSucceeded?: (data: any) => void | Promise<void>;
  onPaymentFailed?: (data: any) => void | Promise<void>;
  onPaymentCanceled?: (data: any) => void | Promise<void>;
  onPaymentRefunded?: (data: any) => void | Promise<void>;
  onPaymentMarkedAsPaid?: (data: any) => void | Promise<void>;

  /**
   * Invoice Event Handlers
   */
  onInvoiceCreated?: (data: any) => void | Promise<void>;
  onInvoiceSent?: (data: any) => void | Promise<void>;
  onInvoiceAccepted?: (data: any) => void | Promise<void>;
  onInvoiceRejected?: (data: any) => void | Promise<void>;
  onInvoiceCompleted?: (data: any) => void | Promise<void>;
  onInvoiceCanceled?: (data: any) => void | Promise<void>;
  onInvoiceUpdated?: (data: any) => void | Promise<void>;

  /**
   * Subscription Event Handlers
   */
  onSubscriptionCreated?: (data: any) => void | Promise<void>;
  onSubscriptionUpdated?: (data: any) => void | Promise<void>;
  onSubscriptionCanceled?: (data: any) => void | Promise<void>;

  /**
   * Catch-all handler for any webhook event
   * This handler is called for ALL events, including those with specific handlers
   */
  onWebhook?: (event: string, data: any) => void | Promise<void>;
}

/**
 * Express request with typed query params
 */
export interface CheckoutRequest extends Request {
  query: CheckoutQuery & Record<string, any>;
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event_type: string;
  event?: string; // Fallback for compatibility
  entity_type?: string;
  entity_id?: string;
  status?: string;
  timestamp?: string;
  data: any;
}
