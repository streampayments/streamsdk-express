import type { Response, NextFunction } from 'express';
import StreamSDK from '@streamsdk/typescript';
import type { CheckoutConfig, CheckoutRequest } from './types';

/**
 * Creates an Express handler for Stream checkout flows
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { Checkout } from '@streamsdk/express';
 *
 * const app = express();
 *
 * app.get('/checkout', Checkout({
 *   apiKey: process.env.STREAM_API_KEY!,
 *   successUrl: 'https://myapp.com/success',
 *   returnUrl: 'https://myapp.com/cancel'
 * }));
 * ```
 *
 * Query parameters:
 * - products: Product ID(s), comma-separated for multiple (required)
 * - name: Custom name for payment link (optional, overrides defaultName)
 * - customerId: Existing customer/consumer ID (optional)
 * - customerEmail: Customer email (for new customers, optional)
 * - customerName: Customer name (for new customers, optional)
 * - customerPhone: Customer phone (for new customers, optional)
 * - metadata: URL-encoded JSON metadata (optional)
 */
export function Checkout(config: CheckoutConfig) {
  const initOptions: any = {};
  if (config.baseUrl) {
    initOptions.baseUrl = config.baseUrl;
  }
  const streamClient = StreamSDK.init(config.apiKey, initOptions);

  return async (req: CheckoutRequest, res: Response, next: NextFunction) => {
    try {
      const {
        products,
        name,
        customerId,
        customerEmail,
        customerName,
        customerPhone,
        metadata
      } = req.query;

      // Parse product IDs
      const productIds = products ? products.split(',').map(id => id.trim()) : [];

      if (productIds.length === 0) {
        return res.status(400).json({
          error: 'At least one product ID is required'
        });
      }

      // Determine payment link name (priority: query param > config default > generated)
      const paymentLinkName = name || config.defaultName || `Checkout ${Date.now()}`;

      // Prepare payment link data
      const paymentLinkData: any = {
        name: paymentLinkName,
        items: productIds.map(id => ({
          product_id: id,
          quantity: 1
        })),
        success_redirect_url: config.successUrl,
        failure_redirect_url: config.returnUrl || config.successUrl,
        coupons: []
      };

      // Handle customer/consumer
      let consumerId = customerId;

      // If no customer ID but have customer details, create or find consumer
      if (!consumerId && (customerPhone || customerEmail)) {
        let existingConsumer = null;

        // Strategy 1: Try to search by phone using search_term (most specific)
        if (customerPhone) {
          try {
            const searchResults = await streamClient.listConsumers({
              page: 1,
              size: 100,
              search_term: customerPhone
            } as any);
            existingConsumer = searchResults.data?.find(c => c.phone_number === customerPhone);
          } catch (searchError) {
            // Search failed, will try next strategy
            console.warn('Search by phone failed, trying email search');
          }
        }

        // Strategy 2: Try to search by email if phone search didn't find anything
        if (!existingConsumer && customerEmail) {
          try {
            const searchResults = await streamClient.listConsumers({
              page: 1,
              size: 100,
              search_term: customerEmail
            } as any);
            existingConsumer = searchResults.data?.find(c =>
              c.email === customerEmail || c.phone_number === customerPhone
            );
          } catch (searchError) {
            // Search failed, will try pagination
            console.warn('Search by email failed, falling back to pagination');
          }
        }

        // Strategy 3: If not found via search, paginate through all consumers (last resort)
        if (!existingConsumer && (customerPhone || customerEmail)) {
          let currentPage = 1;
          const pageSize = 100;
          let hasMorePages = true;

          while (hasMorePages && !existingConsumer) {
            const consumers = await streamClient.listConsumers({
              page: currentPage,
              size: pageSize
            });

            // Try to match by phone or email
            existingConsumer = consumers.data?.find(c =>
              (customerPhone && c.phone_number === customerPhone) ||
              (customerEmail && c.email === customerEmail)
            );

            if (existingConsumer) {
              break;
            }

            // Check if there are more pages
            hasMorePages = consumers.pagination?.has_next_page || false;
            currentPage++;

            // Safety limit to prevent infinite loops (max 50 pages = 5000 consumers)
            if (currentPage > 50) {
              console.warn('Reached maximum page limit (50), stopping consumer search');
              break;
            }
          }
        }

        // If consumer found, use it
        if (existingConsumer) {
          consumerId = existingConsumer.id;
        } else if (customerName) {
          // Create new consumer if not found
          const consumerData: any = {
            name: customerName || 'Customer'
          };

          if (customerPhone) {
            consumerData.phone_number = customerPhone;
          }

          if (customerEmail) {
            consumerData.email = customerEmail;
          }

          const newConsumer = await streamClient.createConsumer(consumerData);
          consumerId = newConsumer.id;
        }
      }

      if (consumerId) {
        paymentLinkData.organization_consumer_id = consumerId;
      }

      // Add metadata if provided
      if (metadata) {
        try {
          const parsedMetadata = JSON.parse(decodeURIComponent(metadata));
          paymentLinkData.metadata = parsedMetadata;
        } catch (e) {
          // Invalid metadata format, skip
        }
      }

      // Create payment link
      const paymentLink = await streamClient.createPaymentLink(paymentLinkData);
      const paymentUrl = streamClient.getPaymentUrl(paymentLink);

      if (!paymentUrl) {
        return res.status(500).json({
          error: 'Failed to generate payment URL'
        });
      }

      // Redirect to payment URL
      res.redirect(paymentUrl);
    } catch (error) {
      next(error);
    }
  };
}
