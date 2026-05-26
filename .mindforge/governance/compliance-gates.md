# MindForge Governance — Compliance Gates

## Purpose
Apply non-bypassable release gates for secrets, approvals, and privacy controls.

## Gate 1 — Required verification
The plan's verify step and the project test suite must pass.

## Gate 2 — Required approvals
Tier 2 and Tier 3 changes must have approved, non-expired approval records.

## Gate 3 — Secret detection
No real secrets may enter the diff, audit log, or published docs.
Override is not permitted.

For tests that exercise secret detection, use clearly fake patterns that do not
 match production secret regexes, for example `TEST_ONLY_FAKE_KEY_abc123`.

## Gate 4 — GDPR/PII compliance check
This gate runs independently of skill loading.

Trigger if the diff adds fields or columns resembling:
`email`, `phone`, `mobile`, `address`, `postcode`, `zip`, `ssn`, `dob`,
`birth_date`, `first_name`, `last_name`, `national_id`, `passport`,
`credit_card`, `bank_account`, `iban`, `bic`

If triggered, verify `.planning/ARCHITECTURE.md` documents retention policy for
 the relevant data. If retention is missing:
- block completion
- write `compliance_gate_failed` to AUDIT
- require Tier 3 compliance approval for override
