---
name: data-governance
version: 1.0.0
min_mindforge_version: 10.6.0
status: stable
triggers: data governance framework, data catalog implementation, data lineage tracking, data access control, data quality framework, data stewardship, metadata management, data classification, data retention policy, data discovery platform, data ownership, data compliance framework
---

# Skill — Data Governance

## When this skill activates
This skill activates when implementing data catalog systems, establishing data ownership models, building lineage tracking, or designing access control frameworks. Use when organizations need to scale data democratization while maintaining compliance and quality.

## Mandatory actions when this skill is active

### Before writing any code
1. Define data classification taxonomy with clear criteria: public, internal, confidential, restricted with handling requirements for each tier
2. Establish data ownership model: domain owners, data stewards, technical custodians with RACI matrix for responsibilities
3. Document compliance requirements: GDPR, CCPA, HIPAA, SOC2 with specific technical controls needed for each regulation
4. Design metadata schema capturing: business definitions, technical specifications, quality metrics, lineage, and access policies

### During implementation
- Build automated data catalog discovery scanning databases, data lakes, APIs, and file systems to populate metadata repository
- Implement column-level lineage tracking from source systems through transformations to final consumption with impact analysis capabilities
- Create role-based access control (RBAC) with attribute-based policies (ABAC) for dynamic access based on data classification and user context
- Establish data quality framework with profiling rules, validation checks, and quality scores at dataset and column level
- Implement data retention policies with automated archival and deletion workflows based on regulatory requirements and business rules
- Build data stewardship workflows for metadata enrichment: business glossary terms, data ownership assignment, quality issue resolution
- Create audit logging for all data access, modifications, and policy changes with immutable trail for compliance reporting

### After implementation
- Deploy self-serve data discovery portal with search, business glossary, quality indicators, and access request workflows
- Generate automated data quality reports with trend analysis, anomaly detection, and stakeholder-specific dashboards
- Create compliance audit packages with evidence of controls: access logs, retention proof, encryption verification, lineage documentation
- Build data governance metrics dashboard: catalog coverage, metadata completeness, quality score trends, access request SLA

## Self-check before task completion
- [ ] Data catalog covers 90%+ of production data assets with accurate business metadata
- [ ] Lineage tracking provides end-to-end visibility from source to consumption with transformation logic
- [ ] Access control policies enforced at query time with separation of duties for sensitive data
- [ ] Data quality framework monitors critical datasets with automated alerting on quality degradation
- [ ] Compliance documentation generated automatically with evidence trails for audit requirements
