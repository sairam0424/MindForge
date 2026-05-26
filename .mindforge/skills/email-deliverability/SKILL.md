---
name: email-deliverability
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: email deliverability, SPF record, DKIM signing, DMARC policy, email warm-up, sender reputation, bounce handling, complaint loop, email authentication, inbox placement, email throttling, transactional email architecture
---

# Skill — Email Deliverability (Authentication & Reputation Architecture)

## When this skill activates
When configuring email sending infrastructure, troubleshooting delivery issues,
warming up new sending domains/IPs, or architecting transactional vs marketing
email separation. Use for any task that affects whether emails reach the inbox.

Core principle: **Reputation is everything** — email deliverability is a long game.
One bad send can destroy months of reputation building. Protect sender reputation
like you protect production uptime.

## Mandatory actions when this skill is active

### Email Authentication Trio (Non-Negotiable)

1. **SPF (Sender Policy Framework):**
   ```dns
   ; Authorize sending IPs/services
   v=spf1 include:_spf.google.com include:sendgrid.net include:amazonses.com -all
   ```

   Rules:
   - List ALL authorized sending services (ESP, transactional provider, corporate mail)
   - End with `-all` (hard fail) not `~all` (soft fail) for production domains
   - Maximum 10 DNS lookups (SPF limit) — use `include` sparingly
   - Audit quarterly: remove services you no longer use
   - Never authorize `+all` (allows anyone to send as you)

2. **DKIM (DomainKeys Identified Mail):**
   ```dns
   ; Public key for signature verification
   selector1._domainkey.example.com IN TXT "v=DKIM1; k=rsa; p=[public_key]"
   ```

   Rules:
   - Every sending service gets its own DKIM selector
   - Minimum 2048-bit RSA key (1024-bit is deprecated)
   - Rotate keys annually (publish new key, wait 48h, remove old)
   - Sign with your own domain (not the ESP's domain) for reputation ownership
   - Verify signatures are passing: check DKIM alignment in email headers

3. **DMARC (Domain-based Message Authentication, Reporting & Conformance):**
   ```dns
   ; Tell receivers what to do with failures
   _dmarc.example.com IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc@example.com; ruf=mailto:dmarc-forensic@example.com; pct=100"
   ```

   Deployment progression:
   ```
   Week 1-2: p=none (monitor only, collect reports)
   Week 3-4: p=quarantine; pct=10 (quarantine 10% of failures)
   Week 5-6: p=quarantine; pct=50
   Week 7-8: p=quarantine; pct=100
   Week 9+:  p=reject (full enforcement — unauthenticated mail rejected)
   ```

   Rules:
   - ALWAYS start at p=none and progress gradually
   - Monitor DMARC reports (rua) weekly for legitimate sending you missed
   - Goal state: p=reject (maximum protection against spoofing)
   - Ensure both SPF and DKIM alignment pass (DMARC requires at least one)

### IP/Domain Warm-Up

4. **Warm-up schedule for new sending infrastructure:**
   ```
   Day 1-3:    50 emails/day (to most engaged recipients only)
   Day 4-7:    100 emails/day
   Week 2:     200-500/day
   Week 3:     500-1,000/day
   Week 4:     1,000-5,000/day
   Week 5:     5,000-10,000/day
   Week 6+:    Increase 2x per week until target volume
   ```

   Rules:
   - Send to MOST ENGAGED recipients first (opened/clicked in last 30 days)
   - Monitor bounce rate after each volume increase (must stay <2%)
   - If bounce rate spikes: stop, investigate, reduce volume
   - Warm-up separately for each mailbox provider (Gmail, Outlook, Yahoo)
   - Transactional and marketing should warm up independently
   - Warm-up takes 6-8 weeks minimum — no shortcuts

### Sender Reputation Monitoring

5. **Key metrics and thresholds:**
   ```
   | Metric               | Healthy    | Warning    | Critical   |
   |----------------------|------------|------------|------------|
   | Bounce rate          | <1%        | 1-2%       | >2%        |
   | Complaint rate       | <0.05%     | 0.05-0.1%  | >0.1%      |
   | Open rate            | >20%       | 10-20%     | <10%       |
   | Spam trap hits       | 0          | 1-2/month  | >2/month   |
   | Blacklist presence   | None       | 1 minor    | Major list |
   ```

   Actions:
   - Warning threshold: investigate root cause, adjust sending patterns
   - Critical threshold: STOP marketing sends immediately, fix before resuming
   - Monitor Google Postmaster Tools, Microsoft SNDS, Yahoo FBL daily
   - Set up alerts for threshold crossings

### Bounce Handling

6. **Bounce classification and response:**
   ```
   Hard bounce (permanent failure):
   - Invalid address, domain doesn't exist, mailbox doesn't exist
   - Action: Remove from list IMMEDIATELY (first occurrence)
   - Never retry a hard bounce

   Soft bounce (temporary failure):
   - Mailbox full, server temporarily unavailable, message too large
   - Action: Retry up to 3 times over 72 hours
   - After 3 soft bounces on same address: treat as hard bounce and suppress

   Complaint (user clicked "spam"):
   - Action: Suppress IMMEDIATELY, never email again
   - Process FBL (Feedback Loop) reports within 1 hour
   - If complaint rate rises: review recent sends for consent issues
   ```

### List Hygiene

7. **Ongoing list maintenance:**
   ```
   - Remove hard bounces: immediately
   - Suppress complaints: immediately
   - Remove unengaged: no open/click in 90 days → sunset sequence → remove
   - Validate on signup: real-time email validation API (catch typos, disposable domains)
   - Re-validate periodically: quarterly bulk validation of full list
   - Double opt-in: recommended for all marketing (required in some jurisdictions)
   ```

### Architecture (Transactional vs Marketing Separation)

8. **Separate sending infrastructure:**
   ```
   Transactional email (receipts, password resets, 2FA):
   - Dedicated IP/subdomain: mail.example.com
   - Priority: immediate delivery (no batching)
   - Volume: consistent, predictable
   - Reputation: protected (never mixed with marketing)

   Marketing email (newsletters, promotions, re-engagement):
   - Dedicated IP/subdomain: news.example.com
   - Priority: send-time optimized (batch by timezone/engagement)
   - Volume: variable, seasonal spikes
   - Reputation: more volatile (isolated from transactional)
   ```

   Rules:
   - NEVER share IPs between transactional and marketing
   - Transactional emails must not contain marketing content (CAN-SPAM)
   - If marketing reputation degrades, transactional delivery is unaffected
   - Use subdomain separation (not just IP) for domain reputation isolation

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Are SPF, DKIM, and DMARC all configured and passing alignment?
- [ ] Is DMARC at p=quarantine or p=reject (not indefinitely at p=none)?
- [ ] Is there a warm-up plan for any new IPs/domains (starting at 50/day)?
- [ ] Are bounce rate (<2%) and complaint rate (<0.1%) being monitored with alerts?
- [ ] Are hard bounces removed immediately and complaints suppressed?
- [ ] Is transactional email on a separate IP/subdomain from marketing?
- [ ] Is there a sunset policy for unengaged recipients (90-day inactivity)?
- [ ] Are real-time email validation and double opt-in implemented for new signups?
