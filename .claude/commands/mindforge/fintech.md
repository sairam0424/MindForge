---
name: mindforge:fintech
description: "Design fintech payment/ledger architecture. Usage: /mindforge:fintech [service] [--domain payments|ledger|kyc] [--compliance pci|sox]"
argument-hint: "[service] [--domain payments|ledger|kyc] [--compliance pci|sox]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Designs secure, compliant fintech architectures for payment processing, double-entry ledgers, and KYC/AML systems. Produces PCI-DSS and SOX-compliant designs with idempotency guarantees, audit trails, and fraud detection patterns for financial service applications.
</objective>

<execution_context>
@.mindforge/skills/fintech-patterns/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/fintech-patterns/`
State: Evaluates fintech service requirements, compliance domains (PCI-DSS, SOX, KYC/AML), and produces architectures with transaction integrity, idempotency, reconciliation, and fraud prevention mechanisms.
</context>

<process>
1. **Domain Analysis**: Identify fintech domain (payment gateway, ledger system, KYC verification, lending platform) and classify transaction types, monetary precision requirements, and regulatory scope.
2. **Compliance Framework**: Map compliance requirements (PCI-DSS SAQ levels, SOX control objectives, KYC/AML screening) to architectural layers and define cardholder data environments, change control procedures, and audit evidence collection.
3. **Transaction Architecture**: Design idempotent transaction processing with unique transaction IDs, state machines for payment flows (authorized → captured → settled), and distributed transaction patterns (Saga, 2PC) with compensation logic.
4. **Ledger Design**: Implement double-entry bookkeeping with immutable transaction logs, account balance reconciliation, and temporal consistency guarantees using event sourcing or append-only ledgers.
5. **Security Controls**: Define tokenization for card data, encryption key hierarchies, secure key storage (HSM), mTLS for inter-service communication, and fraud detection rules (velocity checks, geolocation, device fingerprinting).
6. **Reconciliation Pipeline**: Design automated reconciliation workflows comparing internal ledger against external payment processors, bank statements, and third-party APIs with alerting for discrepancies.
7. **Audit and Reporting**: Generate immutable audit logs for all financial transactions, access to sensitive data, and configuration changes with compliance report generation (PCI quarterly scans, SOX control testing evidence).
</process>
