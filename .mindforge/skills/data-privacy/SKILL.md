---
name: data-privacy
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: GDPR, CCPA, privacy, PII, personal data, personal information, consent,
          data retention, right to erasure, right to access, data portability,
          data subject, anonymise, anonymize, pseudonymise, pseudonymize,
          data minimisation, data minimization, lawful basis, cookie, tracking,
          analytics, marketing, third party, data transfer, cross-border
---

# Skill — Data Privacy Engineering

## When this skill activates
Any task touching personal data collection, storage, processing, or transfer.
Also activates for consent management, analytics, cookie handling, and any
feature where user data flows to third parties.

## Regulatory coverage
This skill covers: GDPR (EU/UK), CCPA/CPRA (California), PIPEDA (Canada),
PDPA (Thailand/Singapore variants), LGPD (Brazil). Requirements often overlap —
implementing GDPR correctly satisfies most other frameworks.

## Mandatory actions when this skill is active

### Data audit — before touching any data feature
Answer these questions before writing code:
1. **What personal data is collected?** (Name, email, IP, device ID, location, behaviour)
2. **What is the lawful basis for processing?** (Consent / Contract / Legitimate interest / Legal obligation)
3. **How long is it retained?** (Must have a defined retention period — not "indefinitely")
4. **Who does it flow to?** (Internal systems only / third-party processors / international transfer)
5. **Can users access, export, and delete their data?**

If you cannot answer all 5: stop. Write the answers in ARCHITECTURE.md under
"Data Privacy" before implementing anything.

### PII handling standards

**Collection:**
- Collect the minimum data required for the stated purpose (data minimisation)
- Obtain consent before collecting non-essential data (analytics, marketing)
- Consent must be: specific, informed, freely given, unambiguous, and withdrawable
- Never pre-tick consent checkboxes. Never bundle consent for different purposes.

**Storage:**
- PII fields in the database must be identified (document in ARCHITECTURE.md)
- Encrypt sensitive PII at rest: financial data, health data, government IDs
- Pseudonymisation: where possible, store a user ID reference rather than PII inline
- Never store PII in: logs, AUDIT.jsonl, git commits, error messages, URL parameters

**Transfer:**
- Third-party processors: must have a Data Processing Agreement (DPA)
- International transfer (out of EU): requires Standard Contractual Clauses or adequacy decision
- Document all third-party data flows in ARCHITECTURE.md

**Retention and deletion:**
- Define retention period for every PII field in the data model
- Implement automated deletion or anonymisation when retention period expires
- Implement "right to erasure": a complete user delete must remove or anonymise ALL their PII
- Implement "right to access": export of all user data in a portable format (JSON/CSV)
- Test deletion: verify that deleted user data does not appear in any API response

### Cookie and tracking standards
```javascript
// Required: granular consent per category
const consentCategories = {
  necessary: true,      // Always true — no consent needed
  functional: false,    // Requires consent
  analytics: false,     // Requires consent
  marketing: false,     // Requires consent — highest bar
};

// Required: record consent with timestamp and version
await recordConsent({
  userId: user.id,
  categories: consentCategories,
  timestamp: new Date().toISOString(),
  policyVersion: '2026-01',
  ipHash: hash(userIp), // Store hash not raw IP for GDPR compliance
});

// Required: honour opt-out immediately
// If analytics: false — stop sending analytics events NOW, not on next page load
```

### Code patterns that are FORBIDDEN under data privacy
```
// ❌ NEVER: Log PII
console.log(`User ${user.email} logged in`) // email in logs = GDPR violation
logger.info({ user }) // entire user object = PII in logs

// ✅ ALWAYS: Log identifiers, never PII
logger.info({ userId: user.id, event: 'login' })

// ❌ NEVER: PII in error messages
throw new Error(`Could not find user ${user.email}`) // exposed in stack traces

// ✅ ALWAYS: identifiers in errors
throw new Error(`Could not find user [id:${user.id}]`)

// ❌ NEVER: PII in URL parameters
GET /api/users?email=john@example.com // logged by web servers, CDNs, browsers

// ✅ ALWAYS: POST body or path parameter by ID
GET /api/users/{id}
```

## Privacy review checklist
Before marking any data-related task done:
- [ ] Lawful basis identified for every data point collected
- [ ] PII never appears in logs, error messages, or URL parameters
- [ ] Retention period defined for every new PII field
- [ ] Third-party data flows documented in ARCHITECTURE.md
- [ ] User delete removes or anonymises ALL PII ✅ / not yet implemented ⚠️
- [ ] Consent UI does not use dark patterns (pre-ticked, bundled, misleading)
