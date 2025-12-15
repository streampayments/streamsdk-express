# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-15

### Added
- Initial release of streamsdk-express
- Checkout handler middleware for Express.js
- Webhooks handler middleware with event routing
- Support for payment.created, payment.completed, payment.failed events
- Support for subscription.created, subscription.updated, subscription.cancelled events
- Support for invoice.created, invoice.paid events
- HMAC-SHA256 webhook signature verification
- TypeScript type definitions
- Dual module support (ESM + CommonJS)
- Comprehensive documentation and examples

### Features
- Drop-in Express middleware
- Declarative configuration
- Guest and authenticated checkout flows
- Auto resource management (consumer and product creation/lookup)
- Full TypeScript support
- Production-ready error handling
