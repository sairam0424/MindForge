---
name: payment-integration
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: payment integration, stripe architecture, payment webhook, idempotent charge, refund flow, PCI scope, payment state machine, subscription billing, payment retry, payment reconciliation, checkout flow, payment method tokenization
compose: security-review
---

# Skill — Payment Integration (Idempotent Payment Architecture)

## When this skill activates
When building or modifying payment flows, integrating payment providers (Stripe,
PayPal, Braintree), handling subscriptions, processing refunds, or dealing with
any money movement in the system. Also activates for PCI compliance considerations.

Core principle: **Idempotency is life** — every payment operation must be safe to
retry without charging the customer twice. When in doubt, err on the side of NOT
charging.

## Mandatory actions when this skill is active

### Payment State Machine

1. **Every payment has a well-defined state machine:**
   ```
   States:
   created → processing → succeeded
                        → failed → (retry) → processing
   succeeded → refund_pending → refunded
   succeeded → disputed → dispute_won (funds returned)
                        → dispute_lost (funds lost)

   State transitions:
   - created → processing: charge initiated with provider
   - processing → succeeded: provider confirms capture
   - processing → failed: provider declines or errors
   - succeeded → refund_pending: refund initiated
   - refund_pending → refunded: provider confirms refund
   ```

   Rules:
   - State transitions are APPEND-ONLY (never delete payment records)
   - Every transition logged with timestamp, actor, and reason
   - Failed payments can retry (max 3 attempts with exponential backoff)
   - Terminal states: succeeded, refunded, dispute_won, dispute_lost

### Idempotency

2. **Idempotency key on every charge call:**
   ```
   Idempotency key format: [user_id]-[order_id]-[attempt_number]
   Example: usr_abc123-ord_xyz789-1

   Rules:
   - Generate idempotency key BEFORE calling payment provider
   - Store key in database alongside payment intent
   - If retry needed: increment attempt number, generate new key
   - Provider stores result by key — retrying same key returns same result
   - Key expiry: 24 hours (Stripe default) — don't retry after that
   ```

   Critical: If the client retries (network timeout, unclear response), the
   idempotency key ensures no double charge. This is non-negotiable.

### Webhook Processing

3. **Webhook handler requirements:**
   ```
   1. Verify signature FIRST (reject if invalid — no processing)
   2. Respond 200 immediately (within 5 seconds)
   3. Process the event ASYNCHRONOUSLY (queue for background processing)
   4. Process IDEMPOTENTLY (same webhook delivered twice = same outcome)
   5. Handle OUT-OF-ORDER delivery (payment_intent.succeeded before payment_intent.created)
   ```

   Implementation:
   ```
   POST /webhooks/stripe
   1. Verify: stripe.webhooks.constructEvent(body, sig, secret)
   2. Dedup: check event.id against processed_events table
   3. If already processed: return 200 (idempotent)
   4. Queue: enqueue event for async processing
   5. Return 200
   6. [Async worker]: process event, update payment state, mark as processed
   ```

   Rules:
   - NEVER do business logic synchronously in the webhook handler
   - Store raw webhook payload for debugging/replay
   - Implement webhook replay for missed events (fetch from provider API)
   - Monitor webhook lag (time between event creation and processing)

### PCI Scope Minimization

4. **Never touch raw card numbers:**
   ```
   Client-side tokenization flow:
   1. User enters card → Stripe.js/Elements captures it
   2. Card data goes DIRECTLY to Stripe (never touches your server)
   3. Stripe returns a token/PaymentMethod ID
   4. Your server uses the token to create charges

   Your server NEVER sees: card number, CVV, expiration date
   Your PCI scope: SAQ-A (lowest level — just a questionnaire)
   ```

   Rules:
   - Use Stripe Elements, PayPal JS SDK, or equivalent client-side tokenization
   - Never log request bodies that might contain card data
   - Never store card data in your database (only token references)
   - If using iframes: ensure they're from the payment provider's domain
   - PCI-DSS audit not required if you stay at SAQ-A level

### Subscription Billing

5. **Subscription lifecycle:**
   ```
   States: trial → active → past_due → canceled → expired

   trial → active: trial period ends, first charge succeeds
   active → past_due: renewal charge fails
   past_due → active: retry succeeds
   past_due → canceled: all retries exhausted + grace period ended
   canceled → active: user resubscribes (new subscription)
   ```

   Dunning (failed payment recovery):
   ```
   Day 0: Charge fails → retry immediately
   Day 1: Second retry
   Day 3: Third retry + email notification ("update payment method")
   Day 7: Final retry + urgent email + in-app banner
   Day 14: Cancel subscription + final email ("your subscription has ended")
   ```

   Rules:
   - Dunning schedule is configurable per plan tier
   - Always give users a way to update payment method without re-subscribing
   - Prorate upgrades/downgrades (charge difference immediately or credit)
   - Webhook: handle invoice.payment_failed for dunning triggers

### Reconciliation

6. **Daily reconciliation process:**
   ```
   Every 24 hours:
   1. Fetch all payments from provider API (last 48 hours, overlap for safety)
   2. Match against internal payment records
   3. Flag discrepancies:
      - Payment in provider but not in our DB (missed webhook)
      - Payment in our DB but not in provider (ghost record)
      - Amount mismatch (partial capture, currency conversion)
      - Status mismatch (we say succeeded, provider says failed)
   4. Auto-resolve simple cases (missed webhook → replay)
   5. Alert on unresolvable discrepancies (requires human review)
   ```

   Rules:
   - Reconciliation runs daily minimum, hourly for high-volume systems
   - Use 48-hour overlap window to catch delayed settlements
   - Discrepancy alerts go to finance + engineering
   - Never auto-resolve amount mismatches (always flag for human)

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Is there a well-defined state machine for payment lifecycle?
- [ ] Does every charge call include an idempotency key?
- [ ] Are webhooks verified (signature), deduplicated, and processed async?
- [ ] Is PCI scope minimized (client-side tokenization, no raw card data on server)?
- [ ] For subscriptions: is the dunning sequence defined with escalating notifications?
- [ ] Is daily reconciliation implemented (provider vs internal records)?
- [ ] Are all payment state transitions logged with timestamp and reason?
- [ ] Has the security-review skill been co-activated for this payment code?
