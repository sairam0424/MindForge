---
name: mindforge:ecommerce
description: "Design ecommerce platform architecture. Usage: /mindforge:ecommerce [component] [--type marketplace|direct|hybrid]"
argument-hint: "[component] [--type marketplace|direct|hybrid]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Designs scalable ecommerce platform architectures for marketplace, direct-to-consumer, and hybrid models. Produces system designs for catalog management, inventory systems, order processing, payment integration, and fulfillment workflows with high-availability patterns.
</objective>

<execution_context>
@.mindforge/skills/ecommerce-architecture/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/ecommerce-architecture/`
State: Evaluates ecommerce business model, component requirements, and produces architecture with product catalog, inventory management, order orchestration, payment flows, and omnichannel fulfillment capabilities.
</context>

<process>
1. **Business Model Analysis**: Identify ecommerce type (marketplace with multiple sellers, direct B2C, B2B wholesale, or hybrid) and define multi-tenancy requirements, seller onboarding, commission structures, and revenue models.
2. **Catalog Architecture**: Design product catalog system with hierarchical categories, dynamic attributes, variant management (size/color/SKU), search indexing (Elasticsearch/Algolia), and personalization engines for recommendations.
3. **Inventory Management**: Architect real-time inventory tracking with stock reservation during checkout, multi-warehouse allocation, backorder handling, and inventory sync with ERP/WMS systems preventing overselling.
4. **Order Processing Pipeline**: Design order state machine (cart → checkout → payment → fulfillment → delivery), orchestration patterns for split shipments, partial refunds, and idempotent order creation with distributed transaction handling.
5. **Payment Integration**: Integrate payment gateways (Stripe, PayPal, Adyen) with tokenization, 3DS authentication, fraud detection, webhook handling for async payment confirmations, and reconciliation with order system.
6. **Fulfillment Orchestration**: Design fulfillment workflows with carrier integration (shipping labels, tracking), warehouse management system communication, returns processing, and customer notification system.
7. **Performance and Scale**: Implement caching strategies (CDN for product images, Redis for cart sessions), database sharding by tenant/region, read replicas for catalog queries, and queue-based processing for order workflows during traffic spikes.
</process>
