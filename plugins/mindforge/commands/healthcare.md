---
name: "mindforge:healthcare"
description: "Design HIPAA-compliant healthcare system architecture. Usage: /mindforge:healthcare [service] [--standard hipaa|hl7|fhir] [--scope full|audit]"
argument-hint: "[service] [--standard hipaa|hl7|fhir] [--scope full|audit]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Designs HIPAA-compliant healthcare system architectures with proper PHI handling, audit trails, and regulatory compliance. Produces architecture diagrams, data flow models, and compliance checklists for healthcare applications including EHR, telemedicine, patient portals, and health data exchanges.
</objective>

<execution_context>
@.mindforge/skills/healthcare-systems/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/healthcare-systems/`
State: Evaluates healthcare service requirements, compliance standards (HIPAA, HL7, FHIR), and produces compliant architecture with security controls, encryption strategies, and audit mechanisms.
</context>

<process>
1. **Service Analysis**: Parse the healthcare service type (EHR, telemedicine, patient portal, HIE) and identify PHI touchpoints, user roles, and data sensitivity classification.
2. **Compliance Mapping**: Map required compliance standards (HIPAA Security/Privacy Rules, HL7 messaging, FHIR resources) to architectural components and identify technical safeguards (encryption at rest/in transit, access controls, audit logs).
3. **Architecture Design**: Design system architecture with secure zones (DMZ, application tier, data tier), authentication/authorization flows (RBAC, ABAC), and PHI access patterns with minimum necessary principle.
4. **Data Flow Modeling**: Model PHI data flows across system boundaries, external integrations (labs, pharmacies, insurance), and patient data exchange patterns with encryption and consent management.
5. **Audit Trail Design**: Design comprehensive audit logging for all PHI access (who, what, when, where, why), tamper-proof log storage, and automated compliance reporting mechanisms.
6. **Security Controls**: Define encryption standards (AES-256, TLS 1.3), key management (HSM, KMS), session management, and incident response procedures for breach notification.
7. **Documentation Generation**: Generate compliance documentation including Security Risk Assessment, BAA requirements, technical safeguards matrix, and architecture decision records for regulatory audits.
</process>
