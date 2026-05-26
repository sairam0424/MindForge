---
name: ai-safety-alignment
version: 1.0.0
min_mindforge_version: 10.5.0
status: stable
triggers: AI safety implementation, AI alignment technique, output filtering AI, content moderation AI, bias detection model, AI guardrail implementation, harmful content prevention, AI red teaming, model safety evaluation, AI ethics implementation, alignment testing, responsible AI deployment
compose:
  - guardrails-and-safety
---

# AI Safety & Alignment

## When this skill activates

This skill activates when implementing output filters, content moderation systems, bias detection, adversarial robustness, or alignment techniques for AI systems. It applies when deploying AI in production environments where safety failures have legal, reputational, or ethical consequences.

## Mandatory actions when this skill is active

### Before writing any code

1. **Define harm taxonomy** — Categorize potential harms specific to your domain: toxic content, misinformation, bias (demographic, cultural), privacy leaks, prompt injection, jailbreaks, copyright violations. Prioritize by severity and likelihood. Not all harms are equal.
2. **Establish safety thresholds** — Define numeric thresholds for each harm category: toxicity score <0.3, PII detection confidence >0.9, bias parity ratio 0.8-1.2. Thresholds must be tuned on representative data, not arbitrary guesses.
3. **Select detection models** — Choose specialized classifiers per harm type: Perspective API or custom models for toxicity, named entity recognition for PII, fairness metrics for bias. General-purpose LLMs are too slow and expensive for real-time safety filtering.
4. **Design layered defense** — Implement multiple safety layers: input validation (reject malicious prompts), model guardrails (constrain model behavior), output filtering (catch harmful completions), monitoring (detect safety failures post-deployment). Single-layer defense is insufficient.

### During implementation

- **Implement input sanitization first** — Validate all user inputs before reaching the model. Reject or sanitize: SQL injection patterns, prompt injection attempts (ignore previous instructions), PII in prompts, excessive length, special characters that break parsing. Log rejected inputs for analysis.
- **Apply constitutional AI principles** — Constrain model behavior via system prompts: "You are a helpful assistant. You must not generate harmful, biased, or illegal content. If asked to do so, politely refuse and explain why." Test refusal behavior extensively.
- **Use classifier-guided generation** — For high-risk domains, run a safety classifier on every output before returning to the user. If toxicity/bias/PII is detected above threshold, retry generation with a modified prompt or return a safe default response.
- **Implement red-teaming as tests** — Create automated adversarial tests: jailbreak attempts, bias triggers, edge cases designed to elicit failures. Run these tests in CI/CD. Safety regressions must block deployment.
- **Log all safety events** — Record every safety filter activation: input rejected, output filtered, threshold exceeded. Include context: user ID, timestamp, input/output text, classifier scores. This data is critical for tuning thresholds and identifying attack patterns.
- **Design graceful degradation** — When safety filters trigger, provide user-friendly explanations: "I can't generate that content because [reason]." Do not expose internal classifier scores or filter logic (attackers use this to evade detection).

### After implementation

- **Validate safety coverage** — Test the system with a held-out safety dataset: known toxic examples, bias triggers, jailbreak prompts. Measure recall (% of harmful content caught) and precision (% of flagged content that is truly harmful). Target: recall >95%, precision >90%.
- **Measure bias across demographics** — Evaluate model outputs for demographic parity, equalized odds, and calibration across protected attributes (race, gender, age). Use fairness toolkits (Fairlearn, AI Fairness 360). Bias gaps >20% require mitigation.
- **Conduct human red-teaming** — Hire external red-teamers to attempt jailbreaks and adversarial attacks. Automated tests miss creative attack vectors. Budget 20-40 hours of red-teaming per major release.
- **Monitor safety in production** — Track safety metrics over time: filter activation rate, false positive rate, user complaints about incorrect filtering. Safety degrades as attackers adapt and user behavior shifts.

## Self-check before task completion

- [ ] Harm taxonomy is defined with severity ratings and likelihood estimates
- [ ] Safety thresholds are set per harm type and validated on representative data
- [ ] Input sanitization rejects malicious prompts before reaching the model
- [ ] Output filtering runs on every completion with <100ms latency overhead
- [ ] Constitutional AI constraints are embedded in system prompts and tested
- [ ] Automated red-teaming tests run in CI/CD and block deployment on failures
- [ ] Safety events are logged with full context for post-hoc analysis
- [ ] Bias is measured across demographics with fairness parity within acceptable bounds
- [ ] Human red-teaming has been conducted with documented attack attempts and mitigations
- [ ] Production monitoring tracks filter activation rate and false positive trends
