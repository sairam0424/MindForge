---
name: mindforge:zero-trust
description: "Design zero-trust network architecture. Usage: /mindforge:zero-trust [system] [--scope internal|external|both] [--mtls]"
argument-hint: "[system] [--scope internal|external|both] [--mtls]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design a zero-trust network architecture that eliminates implicit trust, enforces continuous verification for every communication flow, and implements micro-segmentation with identity-based access control.
</objective>

<execution_context>
@.mindforge/skills/zero-trust-architecture/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/zero-trust-architecture/`
State: Inventories all system communication flows and applies identity verification, mTLS, and micro-segmentation policies.
</context>

<process>
1. **Inventory All Communication Flows**: Map every service-to-service, user-to-service, and external integration communication path. Include direction, protocol, port, and data sensitivity classification.
2. **Classify by Sensitivity**: Assign trust tiers (critical, sensitive, standard) to each flow based on data classification, blast radius, and regulatory requirements. Critical flows get the strictest controls.
3. **Implement Identity Verification Per Flow**: Require cryptographic identity proof for every request — no request is trusted based on network location alone. Use SPIFFE/SPIRE or equivalent workload identity framework.
4. **Enable mTLS for Service-to-Service**: Configure mutual TLS for all internal service communication. Automate certificate rotation with short-lived certificates (hours, not months). Define CA hierarchy.
5. **Configure Micro-Segmentation Policies**: Replace flat network trust with fine-grained allow-list policies. Each service can only communicate with explicitly authorized peers on explicitly authorized ports.
6. **Add Device Posture Checks**: For user-facing access, verify device health (OS patch level, disk encryption, endpoint protection) before granting access. Degrade gracefully for non-compliant devices.
7. **Remove Implicit Trust**: Eliminate VPN-equals-trust model. Being on the corporate network grants zero additional privileges. All access requires explicit authentication and authorization regardless of network origin.
8. **Set Up Continuous Verification**: Implement session re-validation at regular intervals. Monitor for anomalous behavior patterns and trigger step-up authentication or session termination on drift detection.
9. **Document Access Policies**: Produce a comprehensive policy matrix mapping identities to resources with conditions. Store policies as code for version control, audit, and automated enforcement.
10. **Validate with Penetration Testing**: Design adversarial tests that simulate lateral movement, credential theft, and privilege escalation to verify zero-trust controls prevent blast radius expansion.
</process>
