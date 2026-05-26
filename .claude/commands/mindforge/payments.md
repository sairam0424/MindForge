---
description: "Design payment flow architecture with PCI minimization. Usage: /mindforge:payments [flow] [--provider stripe|braintree] [--recurring]"
---

<objective>
Design a robust payment flow architecture that minimizes PCI compliance scope through client-side tokenization, handles webhooks reliably, ensures idempotency across all charge operations, and accounts for the full lifecycle including refunds and disputes.
</objective>

<execution_context>
@.mindforge/skills/payment-integration/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (payment flow type, optional --provider, optional --recurring flag)
Knowledge: PCI DSS requirements, payment provider documentation, existing payment infrastructure, business rules for pricing/billing.
</context>

<process>
1. **Design Payment State Machine**: Model all payment states (pending, processing, succeeded, failed, refunded, disputed) and valid transitions. Include timeout states and partial states (partial refund, partial capture). Visualize as a state diagram.
2. **Implement Client-Side Tokenization**: Use the provider's client-side SDK (Stripe Elements, Braintree Drop-in) to tokenize card data in the browser. Server never sees raw card numbers — this reduces PCI scope to SAQ-A or SAQ-A-EP.
3. **Set Up Webhook Handling**: Implement webhook endpoint with: signature verification (reject unverified), idempotent processing (dedup by event ID), async processing (acknowledge quickly, process in background), and ordered handling for related events.
4. **Add Idempotency Keys To All Charges**: Every charge request must include an idempotency key (client-generated UUID). Store key-to-result mapping. On retry, return cached result instead of double-charging.
5. **Implement Retry Logic For Failures**: Design retry strategy: exponential backoff for transient failures (network, 5xx), immediate fail for permanent errors (card declined, insufficient funds), and alert on repeated failures for the same customer.
6. **Design Refund Flow**: Support full and partial refunds. Track refund reason codes. Implement refund limits (cannot refund more than charged). Handle refund-after-dispute edge case. Update accounting records atomically.
7. **Set Up Daily Reconciliation**: Implement automated daily reconciliation between: internal payment records, provider settlement reports, and accounting system. Alert on discrepancies > threshold. Resolve within 24 hours.
8. **Handle Disputes And Chargebacks**: Design dispute response workflow: auto-collect evidence (receipts, delivery proof, usage logs), notify team within SLA, track win rate, and implement prevention measures for common dispute reasons.
9. **Document Edge Cases**: Catalog and handle: currency conversion timing, 3D Secure flows, subscription payment retries, card expiration mid-subscription, account updater responses, and cross-border payment restrictions.
</process>
