---
name: multi-llm-consult
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: second opinion, cross-model, multi-model, consult, gemini, codex, GPT, alternative model, consensus, multi-LLM, external model, validation
---

# Skill — Multi-LLM Consult

## When this skill activates
When seeking a second opinion from external models, validating a decision across
multiple AI providers, or when the user explicitly requests cross-model consultation.

## Mandatory actions when this skill is active

### Before consulting external models
1. **Sanitize the prompt.** NEVER send raw project context to external models.
   - Remove: file paths, internal variable names, proprietary business logic
   - Remove: API keys, secrets, credentials, internal URLs
   - Remove: user PII, customer data, anything covered by data-privacy skill
   - Keep: the abstract question, general patterns, public knowledge references
2. **Estimate cost.** Each external call costs tokens. Check budget via cost-tracking module.
3. **Define the question clearly.** Vague questions produce vague answers. Frame as:
   - "Given [sanitized context], which approach is better: A or B? Why?"

### Configured Models

| Provider | Model | Best For | Cost Tier |
|----------|-------|----------|-----------|
| Anthropic | claude-opus-4-7 | Deep reasoning, architecture | complex |
| Google | gemini-2.5-pro | Research, long context, web grounding | research |
| OpenAI | gpt-4o | Alternative perspective, validation | consult |

### Consultation Protocol

**Single Consult (one external model):**
1. Sanitize prompt
2. Send to selected model
3. Present response with source attribution
4. Note areas of agreement/disagreement with primary analysis

**Consensus Consult (all 3 models):**
1. Sanitize prompt (same prompt to all)
2. Send to all configured models in parallel
3. Analyze responses for:
   - **Agreement** (2+ models recommend same approach): high confidence signal
   - **Divergence** (models disagree): flag for user decision, present all perspectives
   - **Novel insight** (one model raises a point others missed): highlight specifically
4. Produce synthesis:
   ```
   Consensus: [Yes/No/Partial]
   Recommended: [approach]
   Agreement: [which models agree]
   Dissent: [which models disagree and why]
   Novel: [unique insights from individual models]
   ```

### During consultation
- Log every external call in token-ledger.jsonl (model, tokens, cost)
- Never send more than 2000 tokens to external models per consultation
- If a model is unavailable: skip it, note in output, continue with available models
- Respect rate limits — max 3 consultations per session

### After consultation
- Present results to user with clear attribution
- Never auto-execute based on external model recommendations
- External opinions are ADVISORY — user sovereignty applies
- Log consultation summary in AUDIT

## Self-check before task completion
- [ ] Did I sanitize the prompt before sending to external models?
- [ ] Did I log every external call in token-ledger.jsonl?
- [ ] Did I attribute responses to their source model (no unattributed blending)?
- [ ] Did I remind the user that external opinions are advisory?
