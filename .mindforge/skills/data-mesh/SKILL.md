---
name: data-mesh
version: 1.0.0
min_mindforge_version: 10.6.0
status: stable
triggers: data mesh architecture, domain data ownership, data product design, federated data governance, self-serve data platform, data mesh implementation, data contract mesh, data domain boundary, mesh interoperability, decentralized data ownership, data product specification, domain-driven data
---

# Skill — Data Mesh

## When this skill activates
This skill activates when implementing data mesh architectures with domain-oriented ownership, federated governance, and data-as-a-product principles. Use when centralizing data management becomes a bottleneck and domains need autonomy with interoperability.

## Mandatory actions when this skill is active

### Before writing any code
1. Define domain boundaries using domain-driven design: bounded contexts, ubiquitous language, core domains vs supporting domains with ownership mapping
2. Establish data product specification template: SLAs, schemas, semantics, access controls, versioning, and quality guarantees each domain must provide
3. Design federated computational governance: global standards (discovery, security, interoperability) enforced through platform, local decisions (tech stack, modeling) owned by domains
4. Create self-serve data platform capabilities: provisioning automation, observability tools, discovery services, and development environments domains can use independently

### During implementation
- Build data product registry with standardized metadata: domain owner, SLAs, schemas, sample data, access request process, and consumer feedback
- Implement data contracts between domains: schema definitions, backward compatibility guarantees, deprecation policies, and breaking change notifications
- Create domain-agnostic platform services: infrastructure provisioning (IaC templates), CI/CD pipelines, monitoring dashboards, and cost allocation
- Design data product APIs with consistency: REST for batch, streaming for real-time, query engines for analytical, with versioning and deprecation paths
- Establish quality frameworks domains must implement: data validation, profiling, lineage tracking, incident response with federated monitoring
- Build interoperability layer: common data types, standard formats (Parquet, Avro), semantic layer, and cross-domain joins through data products not direct access
- Implement federated identity and access: domain-owned authorization, centralized authentication, audit logging, and privacy controls enforced at platform level

### After implementation
- Create data product marketplace: searchable catalog, quality scores, usage analytics, consumer reviews, and onboarding documentation
- Build platform health metrics: provisioning time, incident resolution SLA, platform uptime, and developer satisfaction scores
- Generate federated governance reports: compliance by domain, quality trends, cross-domain dependencies, and policy violations
- Document domain interaction patterns: producer-consumer relationships, data sharing agreements, and conflict resolution processes

## Self-check before task completion
- [ ] Domain boundaries clearly defined with ownership assignments and RACI matrix for responsibilities
- [ ] Data products meet platform standards for discoverability, access control, quality, and SLAs
- [ ] Self-serve platform enables domains to provision, deploy, and monitor data products independently
- [ ] Federated governance enforces global standards while allowing domain autonomy in implementation
- [ ] Interoperability tested across domains through data product contracts and APIs, not direct database access
