---
name: "mindforge:ai-safety"
description: "Design AI safety and alignment controls. Usage: /mindforge:ai-safety [system] [--scope output|input|pipeline] [--level basic|comprehensive]"
argument-hint: "[system] [--scope output|input|pipeline] [--level basic|comprehensive]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design comprehensive AI safety and alignment controls for production AI systems, implementing guardrails, monitoring, and intervention mechanisms across input validation, output filtering, and pipeline orchestration. This command creates safety architecture that prevents harmful outputs, detects adversarial inputs, and ensures alignment with ethical guidelines and business policies.
</objective>

<execution_context>
@.mindforge/skills/ai-safety-alignment/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/ai-safety-alignment/`
State: Analyzes the AI system's risk surface, regulatory requirements, and business constraints to generate layered safety controls with monitoring dashboards and incident response protocols.
</context>

<process>
1. **Risk Surface Mapping**: Identify potential failure modes (harmful content, PII leakage, hallucinations, adversarial manipulation), categorize risks by severity and likelihood, and define acceptable risk thresholds per use case.

2. **Input Validation Layer**: Design prompt injection detection using classifier models and pattern matching, implement adversarial input filtering with anomaly detection, and create user intent verification for high-risk operations.

3. **Output Safety Controls**: Architect content moderation pipeline with toxicity classifiers (Perspective API, OpenAI Moderation), implement fact-checking and hallucination detection for critical domains, and design PII redaction with entity recognition and regex patterns.

4. **Alignment Mechanisms**: Define constitutional AI principles and values hierarchy, implement preference learning from human feedback (RLHF/RLAIF), and design reward modeling for behavior shaping toward safe outcomes.

5. **Monitoring and Observability**: Create real-time dashboards tracking safety metric distributions (toxicity scores, rejection rates), implement anomaly alerting for policy violations, and design audit logging for compliance and forensics.

6. **Intervention Protocols**: Design human-in-the-loop workflows for uncertain cases, implement circuit breakers with automatic system degradation, and create escalation paths for critical safety incidents.

7. **Continuous Improvement**: Establish red-teaming protocols for adversarial testing, design A/B testing framework for safety mechanism refinement, and implement feedback loops from user reports and moderator reviews.
</process>
