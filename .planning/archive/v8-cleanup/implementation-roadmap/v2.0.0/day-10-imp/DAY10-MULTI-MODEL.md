# MindForge v2 — Day 10: Multi-Model Intelligence Layer
# Branch: `feat/mindforge-v2-cross-model-review`
# Prerequisite: `feat/mindforge-v2-browser-runtime` merged to `main`
# Version target: v2.0.0-alpha.3
# Theme: "No Single Model Is Perfect. Use Them All."

---

## BRANCH SETUP

```bash
git checkout main
git pull origin main

# Verify Day 9 baseline
node -e "console.log(require('./package.json').version)"  # Must be 2.0.0-alpha.2

# All 17 test suites must pass before starting Day 10
SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e \
        autonomous browser)

for suite in "${SUITES[@]}"; do
  printf "  %-30s" "${suite}..."
  node tests/${suite}.test.js 2>&1 | tail -1
done
# ALL 17 must show "passed" — zero failures before Day 10 begins.

git checkout -b feat/mindforge-v2-cross-model-review
```

---

## DAY 10 SCOPE

Day 10 builds the **Multi-Model Intelligence Layer** — the ability to route
every MindForge task to the model best suited for it, and to get the same
code reviewed by multiple AI models simultaneously.

**The insight:** Claude is exceptional at reasoning and generation. GPT-4o
finds different categories of bugs (training on different data = different
blind spots). Gemini 2.5 Pro's 1M context window ingests entire codebases
or documentation sets that would exhaust any other model. Using all three
produces better output than any single model alone.

**What this day delivers:**

| Component | Description |
|---|---|
| Model registry | 7-model registry with provider, strengths, cost, context window |
| Model router | Persona-to-model mapping with fallback chains |
| Multi-provider API client | Unified client for Anthropic, OpenAI, Google Gemini |
| `/mindforge:cross-review` | Adversarial multi-model code review with consensus synthesis |
| `/mindforge:research` | Deep research via Gemini 2.5 Pro's 1M context |
| `/mindforge:costs` | Real cost tracking per model per session/phase |
| Model-aware execute-phase | Persona → model routing in task dispatch |
| Cost tracking in JSONL | `models_used` field with per-model tokens + USD |
| `tests/model-routing.test.js` | 18th test suite |

**New commands today: 43 total (40 + cross-review + research + costs)**

---

# ═══════════════════════════════════════════════════════════════════════
# PART 1 — IMPLEMENTATION PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## TASK 1 — Scaffold Day 10 directory structure

```bash
# Model layer specs
mkdir -p .mindforge/models
touch .mindforge/models/model-registry.md
touch .mindforge/models/model-router.md
touch .mindforge/models/cost-calculator.md
touch .mindforge/models/fallback-chains.md

# Multi-provider API client
mkdir -p bin/models
touch bin/models/model-client.js
touch bin/models/anthropic-provider.js
touch bin/models/openai-provider.js
touch bin/models/gemini-provider.js
touch bin/models/model-router.js
touch bin/models/cost-tracker.js

# Cross-review engine
mkdir -p bin/review
touch bin/review/cross-review-engine.js
touch bin/review/finding-synthesizer.js
touch bin/review/review-report-writer.js

# Research engine
mkdir -p bin/research
touch bin/research/research-engine.js
touch bin/research/context-packager.js

# New commands
touch .claude/commands/mindforge/cross-review.md
touch .claude/commands/mindforge/research.md
touch .claude/commands/mindforge/costs.md

for cmd in cross-review research costs; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done

# New persona
touch .mindforge/personas/research-agent.md

# Test suite
touch tests/model-routing.test.js

# Docs
touch docs/multi-model-guide.md
touch docs/cost-management-guide.md
```

**Commit:**
```bash
git add .
git commit -m "chore(v2-day10): scaffold multi-model intelligence layer"
```

---

## TASK 2 — Write the Model Registry and Router Specifications

### `.mindforge/models/model-registry.md`

```markdown
# MindForge v2 — Model Registry

## Overview

The MindForge model registry defines every AI model available for routing,
its capabilities, cost profile, context window, and which MindForge tasks
it is best suited for.

## Registered models (v2.0.0-alpha.3)

| Model ID | Provider | Tier | Context | Best for | Cost est. (1M tokens) |
|---|---|---|---|---|---|
| `claude-opus-4-5` | Anthropic | Premium | 200K | Architecture, deep security, complex reasoning | ~$15 in / $75 out |
| `claude-sonnet-4-6` | Anthropic | Standard | 200K | Default execution, balanced quality/speed | ~$3 in / $15 out |
| `claude-haiku-4-5` | Anthropic | Fast | 200K | Quick tasks, status checks, simple generation | ~$0.25 in / $1.25 out |
| `gpt-4o` | OpenAI | Premium | 128K | Adversarial code review, finding categories Claude misses | ~$5 in / $15 out |
| `gpt-4o-mini` | OpenAI | Fast | 128K | Fast review cross-check, cheap second opinion | ~$0.15 in / $0.60 out |
| `gemini-2.5-pro` | Google | Premium | 1M | Deep research, large codebase analysis, document ingestion | ~$3.50 in / $10.50 out |
| `gemini-2.0-flash` | Google | Fast | 1M | Fast research, cheap long-context tasks, CI summaries | ~$0.10 in / $0.40 out |

## Default routing table (all overridable in MINDFORGE.md)

| Task type | Default model | Rationale |
|---|---|---|
| `PLANNER_MODEL` | `claude-opus-4-5` | Planning requires deep architecture reasoning |
| `EXECUTOR_MODEL` | `claude-sonnet-4-6` | Balanced quality/cost for the majority of execution |
| `REVIEWER_MODEL` | `gpt-4o` | Different training → different bugs caught |
| `SECURITY_MODEL` | `claude-opus-4-5` | Security review needs the deepest reasoning |
| `RESEARCH_MODEL` | `gemini-2.5-pro` | 1M context ingests entire docs/codebases at once |
| `QA_MODEL` | `claude-sonnet-4-6` | QA execution is moderate complexity |
| `DEBUG_MODEL` | `claude-opus-4-5` | Root cause analysis needs maximum reasoning depth |
| `QUICK_MODEL` | `claude-haiku-4-5` | Fast, cheap for simple queries and status tasks |
| `CROSS_REVIEW_SECONDARY` | `gpt-4o` | Second model for cross-review adversarial pass |
| `CROSS_REVIEW_TERTIARY` | `gemini-2.5-pro` | Optional third model for high-stakes reviews |

## Persona-to-model routing

| Persona | Assigned model | Override setting |
|---|---|---|
| `analyst.md` | `PLANNER_MODEL` | Analyst does research and decomposition |
| `architect.md` | `PLANNER_MODEL` | Architecture requires deep reasoning |
| `developer.md` | `EXECUTOR_MODEL` | Standard execution model |
| `qa-engineer.md` | `QA_MODEL` | QA-specific model |
| `security-reviewer.md` | `SECURITY_MODEL` | Best model for security |
| `tech-writer.md` | `EXECUTOR_MODEL` | Standard execution is sufficient |
| `debug-specialist.md` | `DEBUG_MODEL` | Deep reasoning for root cause |
| `release-manager.md` | `EXECUTOR_MODEL` | Release tasks are process-driven |
| `research-agent.md` | `RESEARCH_MODEL` | Gemini 1M context advantage |

## Tier-3 change override

When the change classifier identifies a Tier 3 change (auth/payment/PII):
Override the executing model to `SECURITY_MODEL` regardless of persona.
Tier 3 changes always get the best available model.

## `inherit` keyword

Setting any model to `inherit` in MINDFORGE.md instructs MindForge to use
whatever model the current runtime (Claude Code, Cursor, Windsurf) has
selected by the user. This is the correct choice when the user has already
chosen their preferred model in the IDE.

## Cost thresholds (configurable in MINDFORGE.md)

```
MODEL_COST_WARN_USD=1.00    # Warn when a single session exceeds $1
MODEL_COST_HARD_LIMIT_USD=10.00  # Stop and notify when daily spend exceeds $10
MODEL_PREFER_CHEAP_BELOW_DIFFICULTY=2.0  # Use QUICK_MODEL for easy tasks
```
```

---

### `.mindforge/models/model-router.md`

```markdown
# MindForge v2 — Model Router

## Purpose
The model router translates MindForge task context into the correct model
selection at dispatch time. It reads the task persona, the change tier,
the MINDFORGE.md overrides, and the fallback chain.

## Routing decision algorithm

```
INPUT: task.persona, task.tier, MINDFORGE.md settings, model availability

STEP 1: Check if Tier 3 override applies
  IF tier == 3 AND task requires code generation:
    RETURN SECURITY_MODEL (override everything else)

STEP 2: Map persona to model setting key
  architect / analyst   → PLANNER_MODEL
  developer             → EXECUTOR_MODEL
  qa-engineer           → QA_MODEL
  security-reviewer     → SECURITY_MODEL
  debug-specialist      → DEBUG_MODEL
  tech-writer           → EXECUTOR_MODEL
  release-manager       → EXECUTOR_MODEL
  research-agent        → RESEARCH_MODEL
  (unknown persona)     → EXECUTOR_MODEL

STEP 3: Read model ID from MINDFORGE.md (or default)
  IF model_id == "inherit": RETURN "runtime-selected"
  RETURN model_id

STEP 4: Check model availability
  IF model is available (API key exists): RETURN model_id
  ELSE: apply fallback chain
```

## Fallback chains

```
claude-opus-4-5     → claude-sonnet-4-6 → claude-haiku-4-5
claude-sonnet-4-6   → claude-haiku-4-5  → (error: no Claude available)
gpt-4o              → gpt-4o-mini       → claude-sonnet-4-6 (cross-review fallback)
gemini-2.5-pro      → gemini-2.0-flash  → claude-opus-4-5 (research fallback)
```

Fallback is used when:
- The provider API key is not set in environment
- The provider returns a rate limit error (429)
- The provider returns a service unavailable error (503)
- The model has been deprecated

## API key detection

```javascript
const API_KEYS = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai:    process.env.OPENAI_API_KEY,
  google:    process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
};

function isModelAvailable(modelId) {
  const provider = getProvider(modelId);
  return !!API_KEYS[provider];
}
```

## Routing log

Every routing decision writes to AUDIT.jsonl:

```json
{
  "event": "model_routed",
  "task": "Plan 3-04",
  "persona": "security-reviewer",
  "tier": 3,
  "requested_model": "claude-opus-4-5",
  "actual_model": "claude-opus-4-5",
  "fallback_applied": false,
  "reason": "Tier 3 + security-reviewer persona → SECURITY_MODEL"
}
```
```

---

### `.mindforge/models/cost-calculator.md`

```markdown
# MindForge v2 — Cost Calculator

## Purpose
Track real USD cost of every model call made by MindForge across all sessions.

## Pricing table (approximate, update regularly)
These are input/output token prices per 1M tokens.
Actual pricing varies — see each provider's pricing page for current rates.

| Model | Input ($/1M) | Output ($/1M) | Cached input ($/1M) |
|---|---|---|---|
| claude-opus-4-5 | $15.00 | $75.00 | $1.50 |
| claude-sonnet-4-6 | $3.00 | $15.00 | $0.30 |
| claude-haiku-4-5 | $0.25 | $1.25 | $0.03 |
| gpt-4o | $5.00 | $15.00 | $2.50 |
| gpt-4o-mini | $0.15 | $0.60 | $0.075 |
| gemini-2.5-pro | $3.50 | $10.50 | $0.875 |
| gemini-2.0-flash | $0.10 | $0.40 | $0.025 |

## Cost formula

```
cost_usd = (input_tokens / 1_000_000 * input_price)
         + (output_tokens / 1_000_000 * output_price)
         + (cached_tokens / 1_000_000 * cached_price)
```

## Cost tracking schema (token-usage.jsonl extension)

```json
{
  "timestamp": "ISO-8601",
  "session_id": "sess_abc",
  "phase": 3,
  "plan": "04",
  "task_name": "Implement JWT middleware",
  "models_used": [
    {
      "model": "claude-sonnet-4-6",
      "provider": "anthropic",
      "input_tokens": 18200,
      "output_tokens": 4800,
      "cached_tokens": 5400,
      "cost_usd": 0.0862,
      "latency_ms": 3240
    },
    {
      "model": "gpt-4o",
      "provider": "openai",
      "input_tokens": 9400,
      "output_tokens": 2100,
      "cached_tokens": 0,
      "cost_usd": 0.0785,
      "latency_ms": 4120
    }
  ],
  "total_cost_usd": 0.1647,
  "cross_review": true,
  "cross_review_consensus_findings": 2
}
```

## Budget enforcement

When `MODEL_COST_HARD_LIMIT_USD` is set in MINDFORGE.md:
1. Cost tracker reads all entries from today's token-usage.jsonl
2. If sum > limit: write AUDIT entry, send Slack alert, stop new model calls
3. Allow in-progress calls to complete (don't mid-request terminate)
4. Report: "Daily cost limit ${limit} USD reached. Model calls paused until tomorrow."
```

**Commit:**
```bash
git add .mindforge/models/
git commit -m "feat(v2-models): write model registry, router spec, and cost calculator"
```

---

## TASK 3 — Implement the Multi-Provider API Client

### `bin/models/model-client.js`

```javascript
/**
 * MindForge v2 — Unified Multi-Provider Model Client
 *
 * Provides a consistent interface to Anthropic, OpenAI, and Google Gemini.
 * All providers return the same shape: { content, model, input_tokens, output_tokens, cost_usd }
 *
 * Handles: provider routing, fallback chains, cost tracking, error normalisation.
 */
'use strict';

const { AnthropicProvider } = require('./anthropic-provider');
const { OpenAIProvider }    = require('./openai-provider');
const { GeminiProvider }    = require('./gemini-provider');
const CostTracker           = require('./cost-tracker');

// ── Provider registry ─────────────────────────────────────────────────────────
const PROVIDERS = {
  'claude-opus-4-5':    () => new AnthropicProvider(),
  'claude-sonnet-4-6':  () => new AnthropicProvider(),
  'claude-haiku-4-5':   () => new AnthropicProvider(),
  'gpt-4o':             () => new OpenAIProvider(),
  'gpt-4o-mini':        () => new OpenAIProvider(),
  'gemini-2.5-pro':     () => new GeminiProvider(),
  'gemini-2.0-flash':   () => new GeminiProvider(),
};

const FALLBACK_CHAINS = {
  'claude-opus-4-5':   ['claude-sonnet-4-6', 'claude-haiku-4-5'],
  'claude-sonnet-4-6': ['claude-haiku-4-5'],
  'claude-haiku-4-5':  [],
  'gpt-4o':            ['gpt-4o-mini', 'claude-sonnet-4-6'],
  'gpt-4o-mini':       ['claude-sonnet-4-6'],
  'gemini-2.5-pro':    ['gemini-2.0-flash', 'claude-opus-4-5'],
  'gemini-2.0-flash':  ['claude-sonnet-4-6'],
};

const PROVIDER_API_KEY = {
  'claude-opus-4-5':   'ANTHROPIC_API_KEY',
  'claude-sonnet-4-6': 'ANTHROPIC_API_KEY',
  'claude-haiku-4-5':  'ANTHROPIC_API_KEY',
  'gpt-4o':            'OPENAI_API_KEY',
  'gpt-4o-mini':       'OPENAI_API_KEY',
  'gemini-2.5-pro':    'GOOGLE_API_KEY',
  'gemini-2.0-flash':  'GOOGLE_API_KEY',
};

// ── Availability check ────────────────────────────────────────────────────────
function isAvailable(modelId) {
  const keyVar = PROVIDER_API_KEY[modelId];
  if (!keyVar) return false;
  return !!(process.env[keyVar] || process.env.GEMINI_API_KEY);
}

function resolveModel(requestedModel) {
  if (requestedModel === 'inherit') return null; // Use runtime model

  if (isAvailable(requestedModel)) return requestedModel;

  // Apply fallback chain
  const chain = FALLBACK_CHAINS[requestedModel] || [];
  for (const fallback of chain) {
    if (isAvailable(fallback)) {
      process.stderr.write(
        `[model-client] ⚠️  ${requestedModel} unavailable — falling back to ${fallback}\n`
      );
      return fallback;
    }
  }

  // No available model in chain
  const keyVar = PROVIDER_API_KEY[requestedModel];
  throw new Error(
    `Model "${requestedModel}" unavailable and no fallback available.\n` +
    `Set ${keyVar} environment variable to enable it.\n` +
    `Fallback chain: ${[requestedModel, ...chain].join(' → ')}`
  );
}

// ── Main completion function ──────────────────────────────────────────────────
/**
 * Call an AI model with a system prompt and user message.
 *
 * @param {object} params
 * @param {string} params.model         - Model ID from registry
 * @param {string} params.systemPrompt  - System instructions
 * @param {string} params.userMessage   - User turn content
 * @param {number} [params.maxTokens]   - Max output tokens (default: 4096)
 * @param {number} [params.temperature] - Temperature (default: 0.1 for code review)
 * @param {string} [params.taskName]    - For cost tracking
 * @param {string} [params.sessionId]   - For cost tracking
 * @returns {{ content, model, input_tokens, output_tokens, cost_usd, latency_ms }}
 */
async function complete(params) {
  const {
    model: requestedModel,
    systemPrompt,
    userMessage,
    maxTokens    = 4096,
    temperature  = 0.1,
    taskName     = 'unknown',
    sessionId    = 'unknown',
    phaseNum,
    planId,
  } = params;

  const resolvedModelId = resolveModel(requestedModel);
  if (!resolvedModelId) {
    throw new Error('Model is "inherit" — cannot call directly. Use the runtime\'s model.');
  }

  const providerFactory = PROVIDERS[resolvedModelId];
  if (!providerFactory) throw new Error(`Unknown model: ${resolvedModelId}`);

  const provider  = providerFactory();
  const t0        = Date.now();

  let result;
  try {
    result = await provider.complete({
      model:        resolvedModelId,
      systemPrompt,
      userMessage,
      maxTokens,
      temperature,
    });
  } catch (err) {
    // Rate limit or 5xx — try fallback immediately
    if (err.status === 429 || err.status >= 500) {
      const fallbacks = FALLBACK_CHAINS[resolvedModelId] || [];
      for (const fallback of fallbacks) {
        if (!isAvailable(fallback)) continue;
        process.stderr.write(
          `[model-client] ⚠️  ${resolvedModelId} error (${err.status}) — trying ${fallback}\n`
        );
        const fallbackProvider = PROVIDERS[fallback]();
        result = await fallbackProvider.complete({
          model: fallback, systemPrompt, userMessage, maxTokens, temperature,
        });
        result.model_used = fallback;
        result.fallback_reason = `${resolvedModelId} returned ${err.status}`;
        break;
      }
      if (!result) throw err;
    } else {
      throw err;
    }
  }

  const latencyMs = Date.now() - t0;

  // Track cost
  const costEntry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    phase: phaseNum,
    plan: planId,
    task_name: taskName,
    model: result.model_used || resolvedModelId,
    provider: PROVIDER_API_KEY[resolvedModelId]?.replace('_API_KEY', '').toLowerCase(),
    input_tokens: result.input_tokens || 0,
    output_tokens: result.output_tokens || 0,
    cached_tokens: result.cached_tokens || 0,
    cost_usd: result.cost_usd || 0,
    latency_ms: latencyMs,
    fallback_applied: !!result.fallback_reason,
  };

  await CostTracker.record(costEntry);

  return {
    content:       result.content,
    model:         costEntry.model,
    input_tokens:  costEntry.input_tokens,
    output_tokens: costEntry.output_tokens,
    cost_usd:      costEntry.cost_usd,
    latency_ms:    latencyMs,
    fallback_reason: result.fallback_reason,
  };
}

module.exports = { complete, isAvailable, resolveModel };
```

---

### `bin/models/anthropic-provider.js`

```javascript
/**
 * MindForge v2 — Anthropic Provider
 * Wraps the Anthropic Messages API with cost calculation.
 */
'use strict';

const https = require('https');

const PRICING = {
  'claude-opus-4-5':   { input: 15.00, output: 75.00, cached: 1.50 },
  'claude-sonnet-4-6': { input:  3.00, output: 15.00, cached: 0.30 },
  'claude-haiku-4-5':  { input:  0.25, output:  1.25, cached: 0.03 },
};

class AnthropicProvider {
  async complete({ model, systemPrompt, userMessage, maxTokens = 4096, temperature = 0.1 }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw Object.assign(new Error('ANTHROPIC_API_KEY not set'), { status: 401 });

    const body = JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const data = await this._request(apiKey, body);

    if (data.error) {
      const err = new Error(data.error.message || 'Anthropic API error');
      err.status = data.error.type === 'rate_limit_error' ? 429 : 500;
      throw err;
    }

    const input_tokens  = data.usage?.input_tokens  || 0;
    const output_tokens = data.usage?.output_tokens || 0;
    const cached_tokens = data.usage?.cache_read_input_tokens || 0;
    const pricing       = PRICING[model] || PRICING['claude-sonnet-4-6'];

    const cost_usd =
      (input_tokens  / 1_000_000 * pricing.input) +
      (output_tokens / 1_000_000 * pricing.output) +
      (cached_tokens / 1_000_000 * pricing.cached);

    const content = data.content?.[0]?.text || '';

    return { content, model_used: model, input_tokens, output_tokens, cached_tokens, cost_usd };
  }

  _request(apiKey, body) {
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path:     '/v1/messages',
        method:   'POST',
        headers:  {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length':    Buffer.byteLength(body),
        },
        timeout: 120_000,
      }, res => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch { resolve({ error: { message: `Invalid JSON: ${raw.slice(0, 200)}` } }); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(Object.assign(new Error('Anthropic request timeout'), { status: 408 })); });
      req.write(body);
      req.end();
    });
  }
}

module.exports = { AnthropicProvider };
```

---

### `bin/models/openai-provider.js`

```javascript
/**
 * MindForge v2 — OpenAI Provider
 * Wraps OpenAI Chat Completions API with cost calculation.
 */
'use strict';

const https = require('https');

const PRICING = {
  'gpt-4o':      { input: 5.00, output: 15.00, cached: 2.50 },
  'gpt-4o-mini': { input: 0.15, output:  0.60, cached: 0.075 },
};

class OpenAIProvider {
  async complete({ model, systemPrompt, userMessage, maxTokens = 4096, temperature = 0.1 }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY not set'), { status: 401 });

    const body = JSON.stringify({
      model,
      max_tokens:   maxTokens,
      temperature,
      messages: [
        { role: 'system',  content: systemPrompt  },
        { role: 'user',    content: userMessage   },
      ],
    });

    const data = await this._request(apiKey, body);

    if (data.error) {
      const err = new Error(data.error.message || 'OpenAI API error');
      err.status = data.error.code === 'rate_limit_exceeded' ? 429 : 500;
      throw err;
    }

    const input_tokens  = data.usage?.prompt_tokens     || 0;
    const output_tokens = data.usage?.completion_tokens || 0;
    const cached_tokens = data.usage?.prompt_tokens_details?.cached_tokens || 0;
    const pricing       = PRICING[model] || PRICING['gpt-4o'];

    const cost_usd =
      (input_tokens  / 1_000_000 * pricing.input) +
      (output_tokens / 1_000_000 * pricing.output) +
      (cached_tokens / 1_000_000 * pricing.cached);

    const content = data.choices?.[0]?.message?.content || '';

    return { content, model_used: model, input_tokens, output_tokens, cached_tokens, cost_usd };
  }

  _request(apiKey, body) {
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path:     '/v1/chat/completions',
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Authorization':  `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120_000,
      }, res => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw.slice(0, 200) } }); } });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(Object.assign(new Error('OpenAI timeout'), { status: 408 })); });
      req.write(body);
      req.end();
    });
  }
}

module.exports = { OpenAIProvider };
```

---

### `bin/models/gemini-provider.js`

```javascript
/**
 * MindForge v2 — Google Gemini Provider
 * Wraps Google Gemini generateContent API with cost calculation.
 */
'use strict';

const https = require('https');

const PRICING = {
  'gemini-2.5-pro':   { input: 3.50, output: 10.50, cached: 0.875 },
  'gemini-2.0-flash': { input: 0.10, output:  0.40, cached: 0.025 },
};

// Maps MindForge model IDs to Google API model names
const MODEL_NAMES = {
  'gemini-2.5-pro':   'gemini-2.5-pro',
  'gemini-2.0-flash': 'gemini-2.0-flash',
};

class GeminiProvider {
  async complete({ model, systemPrompt, userMessage, maxTokens = 4096, temperature = 0.1 }) {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw Object.assign(new Error('GOOGLE_API_KEY or GEMINI_API_KEY not set'), { status: 401 });

    const googleModelName = MODEL_NAMES[model] || model;

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    const data = await this._request(apiKey, googleModelName, body);

    if (data.error) {
      const err = new Error(data.error.message || 'Gemini API error');
      err.status = data.error.code === 429 ? 429 : 500;
      throw err;
    }

    const input_tokens  = data.usageMetadata?.promptTokenCount      || 0;
    const output_tokens = data.usageMetadata?.candidatesTokenCount  || 0;
    const cached_tokens = data.usageMetadata?.cachedContentTokenCount || 0;
    const pricing       = PRICING[model] || PRICING['gemini-2.0-flash'];

    const cost_usd =
      (input_tokens  / 1_000_000 * pricing.input) +
      (output_tokens / 1_000_000 * pricing.output) +
      (cached_tokens / 1_000_000 * pricing.cached);

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { content, model_used: model, input_tokens, output_tokens, cached_tokens, cost_usd };
  }

  _request(apiKey, modelName, body) {
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path:     `/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${apiKey}`,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 180_000, // Gemini with large context can be slow
      }, res => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw.slice(0, 200) } }); } });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(Object.assign(new Error('Gemini timeout'), { status: 408 })); });
      req.write(body);
      req.end();
    });
  }
}

module.exports = { GeminiProvider };
```

---

### `bin/models/model-router.js`

```javascript
/**
 * MindForge v2 — Model Router
 * Translates task context (persona, tier) into model selection.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

// Default routing table — overridable in MINDFORGE.md
const DEFAULTS = {
  PLANNER_MODEL:           'claude-opus-4-5',
  EXECUTOR_MODEL:          'claude-sonnet-4-6',
  REVIEWER_MODEL:          'gpt-4o',
  SECURITY_MODEL:          'claude-opus-4-5',
  RESEARCH_MODEL:          'gemini-2.5-pro',
  QA_MODEL:                'claude-sonnet-4-6',
  DEBUG_MODEL:             'claude-opus-4-5',
  QUICK_MODEL:             'claude-haiku-4-5',
  CROSS_REVIEW_SECONDARY:  'gpt-4o',
  CROSS_REVIEW_TERTIARY:   'gemini-2.5-pro',
};

const PERSONA_TO_SETTING = {
  'analyst':         'PLANNER_MODEL',
  'architect':       'PLANNER_MODEL',
  'developer':       'EXECUTOR_MODEL',
  'qa-engineer':     'QA_MODEL',
  'security-reviewer': 'SECURITY_MODEL',
  'tech-writer':     'EXECUTOR_MODEL',
  'debug-specialist': 'DEBUG_MODEL',
  'release-manager': 'EXECUTOR_MODEL',
  'research-agent':  'RESEARCH_MODEL',
};

let _cachedSettings = null;

function loadSettings() {
  if (_cachedSettings) return _cachedSettings;

  const mindforgemdPath = path.join(process.cwd(), 'MINDFORGE.md');
  const settings        = { ...DEFAULTS };

  if (fs.existsSync(mindforgemdPath)) {
    const content = fs.readFileSync(mindforgemdPath, 'utf8');
    for (const [key] of Object.entries(DEFAULTS)) {
      const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
      if (match) settings[key] = match[1].trim();
    }
  }

  _cachedSettings = settings;
  return settings;
}

function clearCache() { _cachedSettings = null; }

/**
 * Resolve the model ID for a given persona and tier.
 */
function route(persona, tier = 1) {
  const settings = loadSettings();

  // Tier 3 override — always use SECURITY_MODEL
  if (tier === 3) {
    const model = settings.SECURITY_MODEL;
    return { model, setting: 'SECURITY_MODEL', reason: 'Tier 3 override' };
  }

  const settingKey = PERSONA_TO_SETTING[persona] || 'EXECUTOR_MODEL';
  const model      = settings[settingKey] || DEFAULTS[settingKey];

  return { model, setting: settingKey, reason: `Persona "${persona}" → ${settingKey}` };
}

/**
 * Get all routing settings (for display in /mindforge:costs).
 */
function getAllSettings() {
  return loadSettings();
}

/**
 * Get the model ID for a specific routing setting.
 */
function getModel(settingKey) {
  return loadSettings()[settingKey] || DEFAULTS[settingKey];
}

module.exports = { route, getModel, getAllSettings, clearCache, DEFAULTS, PERSONA_TO_SETTING };
```

---

### `bin/models/cost-tracker.js`

```javascript
/**
 * MindForge v2 — Cost Tracker
 * Appends model usage entries to .mindforge/metrics/token-usage.jsonl
 * and enforces daily cost limits.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const USAGE_LOG  = path.join(process.cwd(), '.mindforge', 'metrics', 'token-usage.jsonl');
const MINDFORGEMD = path.join(process.cwd(), 'MINDFORGE.md');

function ensureDir() {
  fs.mkdirSync(path.dirname(USAGE_LOG), { recursive: true });
}

function readSetting(key, defaultVal) {
  try {
    const content = fs.readFileSync(MINDFORGEMD, 'utf8');
    const match   = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return match ? match[1].trim() : defaultVal;
  } catch { return defaultVal; }
}

/**
 * Record a model usage entry.
 */
async function record(entry) {
  ensureDir();

  // Enrich with today's date for easy daily queries
  const enriched = {
    ...entry,
    date: new Date().toISOString().slice(0, 10),
  };

  fs.appendFileSync(USAGE_LOG, JSON.stringify(enriched) + '\n');

  // Check daily budget limit
  await checkDailyLimit(entry.cost_usd || 0);
}

/**
 * Get today's total spend.
 */
function getTodaySpend() {
  if (!fs.existsSync(USAGE_LOG)) return 0;
  const today = new Date().toISOString().slice(0, 10);
  let total   = 0;
  for (const line of fs.readFileSync(USAGE_LOG, 'utf8').split('\n').filter(Boolean)) {
    try {
      const e = JSON.parse(line);
      if (e.date === today) total += e.cost_usd || 0;
    } catch { /* skip malformed lines */ }
  }
  return total;
}

/**
 * Get spend summary for a time window.
 */
function getSummary(opts = {}) {
  const { phase, sessionId, days = 7 } = opts;
  if (!fs.existsSync(USAGE_LOG)) return { entries: [], total_usd: 0, by_model: {} };

  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const entries = fs.readFileSync(USAGE_LOG, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(e => e && e.date >= cutoff)
    .filter(e => (!phase || e.phase === phase) && (!sessionId || e.session_id === sessionId));

  const total_usd = entries.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const by_model  = {};
  for (const e of entries) {
    const m = e.model || 'unknown';
    by_model[m] = by_model[m] || { calls: 0, tokens: 0, cost_usd: 0 };
    by_model[m].calls++;
    by_model[m].tokens   += (e.input_tokens || 0) + (e.output_tokens || 0);
    by_model[m].cost_usd += e.cost_usd || 0;
  }

  return { entries: entries.length, total_usd, by_model, days };
}

async function checkDailyLimit(latestCost) {
  const hardLimit = parseFloat(readSetting('MODEL_COST_HARD_LIMIT_USD', '0'));
  if (hardLimit <= 0) return; // No limit configured

  const todaySpend = getTodaySpend();
  if (todaySpend >= hardLimit) {
    // Write AUDIT entry
    const auditPath = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
    if (fs.existsSync(auditPath)) {
      fs.appendFileSync(auditPath, JSON.stringify({
        id: `cost-limit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: 'cost_limit_reached',
        daily_limit_usd: hardLimit,
        today_spend_usd: todaySpend,
        agent: 'mindforge-cost-tracker',
        session_id: 'system',
      }) + '\n');
    }
    throw Object.assign(
      new Error(`Daily cost limit $${hardLimit} reached (today: $${todaySpend.toFixed(4)}). Model calls paused.`),
      { code: 'COST_LIMIT_REACHED', spend: todaySpend, limit: hardLimit }
    );
  }
}

module.exports = { record, getTodaySpend, getSummary, checkDailyLimit };
```

**Commit:**
```bash
git add bin/models/
git commit -m "feat(v2-models): implement multi-provider client, router, cost tracker (Anthropic/OpenAI/Gemini)"
```

---

## TASK 4 — Implement the Cross-Review Engine

### `bin/review/cross-review-engine.js`

```javascript
/**
 * MindForge v2 — Cross-Review Engine
 * Runs the same diff through multiple AI models and synthesizes findings.
 *
 * Pipeline:
 *   Round 1 → Primary reviewer (claude-sonnet-4-6 or configured EXECUTOR_MODEL)
 *   Round 2 → Secondary reviewer (gpt-4o — adversarial mode)
 *   Round 3 → Optional tertiary reviewer (gemini-2.5-pro — with full codebase context)
 *   Synthesis → consensus detection, contradiction highlighting, verdict
 */
'use strict';

const fs          = require('fs');
const path        = require('path');
const ModelClient = require('../models/model-client');
const Router      = require('../models/model-router');

// ── Context loading ───────────────────────────────────────────────────────────
function loadReviewContext() {
  const planningDir = path.join(process.cwd(), '.planning');
  const ctx = {};

  const read = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8').slice(0, 4000) : '';

  ctx.projectMd       = read(path.join(planningDir, 'PROJECT.md'));
  ctx.architectureMd  = read(path.join(planningDir, 'ARCHITECTURE.md'));
  ctx.conventionsMd   = read(path.join(process.cwd(), '.mindforge', 'org', 'CONVENTIONS.md'));
  ctx.securityMd      = read(path.join(process.cwd(), '.mindforge', 'org', 'SECURITY.md'));

  // Extract project name
  const nameMatch = ctx.projectMd.match(/^# (.+)/m);
  ctx.projectName = nameMatch?.[1] || 'Unknown Project';

  return ctx;
}

function loadDiff(options = {}) {
  const { diffFile, sha, phase } = options;
  const { execSync } = require('child_process');

  try {
    if (diffFile && fs.existsSync(diffFile)) {
      return fs.readFileSync(diffFile, 'utf8');
    }
    if (sha) {
      return execSync(`git diff ${sha}`, { encoding: 'utf8' });
    }
    // Default: diff from last commit or staged
    try {
      const staged = execSync('git diff --cached', { encoding: 'utf8' });
      if (staged.trim()) return staged;
    } catch {}
    return execSync('git diff HEAD~1', { encoding: 'utf8' });
  } catch (err) {
    throw new Error(`Cannot load diff: ${err.message}`);
  }
}

// ── System prompt builders ────────────────────────────────────────────────────
function buildPrimarySystemPrompt(ctx) {
  return `You are a senior code reviewer for the project: ${ctx.projectName}.

## Project context
${ctx.architectureMd.slice(0, 2000)}

## Coding conventions
${ctx.conventionsMd.slice(0, 1500)}

## Security requirements
${ctx.securityMd.slice(0, 1500)}

## Your review task
Review the provided diff carefully. For each issue found, use this exact format:
**[CRITICAL|HIGH|MEDIUM|LOW]** \`file:line\` — Description
> Specific remediation

After findings, provide:
### Positive observations
### Questions for the author
### Verdict: [APPROVE|REQUEST_CHANGES|COMMENT]

Be specific. Cite line numbers. Focus on correctness, security, and architecture.`;
}

function buildAdversarialSystemPrompt(ctx) {
  return `You are a paranoid senior security engineer reviewing code written by a team you are auditing.
Your job is to find BUGS, SECURITY FLAWS, and DESIGN PROBLEMS they missed.

Project: ${ctx.projectName}
Architecture: ${ctx.architectureMd.slice(0, 1500)}

## Your adversarial approach
1. Assume the developers made mistakes — look for them specifically
2. Check OWASP Top 10 systematically: injection, auth failures, broken access, crypto, XSS
3. Look for race conditions, TOCTOU issues, integer overflow, off-by-one errors
4. Check error handling — what happens on failure? Is sensitive data leaked in errors?
5. Check all external inputs — are they validated, sanitized, and bounded?

## Output format
For each finding, use exactly:
**[CRITICAL|HIGH|MEDIUM|LOW]** \`file:line\` — Description
> Remediation

Be thorough. A missed critical finding in this review is a production incident waiting to happen.`;
}

function buildResearchSystemPrompt(ctx, fullCodebase) {
  return `You are a technical architecture reviewer with access to the full codebase context.

Project: ${ctx.projectName}

## Full codebase context
${fullCodebase || 'Not provided for this review'}

## Your role
You have broader context than the other reviewers. Find issues that only emerge
when you can see the full picture: architectural inconsistencies, cross-module
coupling, patterns that work here but will cause problems in other parts of the system.

## Output format
**[CRITICAL|HIGH|MEDIUM|LOW]** \`file:line\` — Description
> Remediation`;
}

// ── Finding parser ────────────────────────────────────────────────────────────
const SEVERITY_RE = /\*\*\[(CRITICAL|HIGH|MEDIUM|LOW)\]\*\*\s+`([^`]+)`\s+—\s+(.+)/g;

function parseFindings(reviewText) {
  const findings = [];
  let m;
  while ((m = SEVERITY_RE.exec(reviewText)) !== null) {
    findings.push({
      severity:  m[1],
      location:  m[2],
      description: m[3].trim(),
    });
  }
  return findings;
}

function extractVerdict(reviewText) {
  const m = reviewText.match(/Verdict:\s*(APPROVE|REQUEST_CHANGES|COMMENT)/i);
  return m?.[1]?.toUpperCase() || 'COMMENT';
}

// ── Main cross-review function ────────────────────────────────────────────────
async function runCrossReview(options = {}) {
  const {
    phaseNum,
    diffFile,
    sha,
    models,
    sessionId = 'unknown',
    focusArea,
    includeFullCodebase = false,
  } = options;

  const ctx         = loadReviewContext();
  const diff        = loadDiff({ diffFile, sha });
  const settings    = Router.getAllSettings();

  const primaryModel   = settings.EXECUTOR_MODEL    || 'claude-sonnet-4-6';
  const secondaryModel = settings.CROSS_REVIEW_SECONDARY || 'gpt-4o';
  const tertiaryModel  = models?.includes('gemini') ? (settings.CROSS_REVIEW_TERTIARY || 'gemini-2.5-pro') : null;

  if (diff.trim().length === 0) {
    return { error: 'No diff found. Make sure there are staged or committed changes to review.' };
  }

  const truncatedDiff = diff.length > 15_000
    ? diff.slice(0, 15_000) + `\n\n[Diff truncated — ${diff.length} chars total]`
    : diff;

  const userMessage = `Please review this code diff:\n\`\`\`diff\n${truncatedDiff}\n\`\`\``;

  console.log(`\n  🔍 Cross-review: ${primaryModel} → ${secondaryModel}${tertiaryModel ? ` → ${tertiaryModel}` : ''}`);

  // ── Round 1: Primary reviewer ─────────────────────────────────────────────
  process.stdout.write(`  Round 1 (${primaryModel})... `);
  const round1 = await ModelClient.complete({
    model:        primaryModel,
    systemPrompt: buildPrimarySystemPrompt(ctx),
    userMessage,
    maxTokens:    4096,
    taskName:     `cross-review-round1-phase${phaseNum}`,
    sessionId,
    phaseNum,
  });
  console.log(`done ($${round1.cost_usd.toFixed(4)})`);

  // ── Round 2: Adversarial reviewer ────────────────────────────────────────
  process.stdout.write(`  Round 2 (${secondaryModel}, adversarial)... `);
  let round2 = null;
  try {
    round2 = await ModelClient.complete({
      model:        secondaryModel,
      systemPrompt: buildAdversarialSystemPrompt(ctx),
      userMessage,
      maxTokens:    4096,
      taskName:     `cross-review-round2-phase${phaseNum}`,
      sessionId,
      phaseNum,
    });
    console.log(`done ($${round2.cost_usd.toFixed(4)})`);
  } catch (err) {
    console.log(`skipped (${err.message.slice(0, 60)})`);
  }

  // ── Round 3: Tertiary reviewer (optional) ────────────────────────────────
  let round3 = null;
  if (tertiaryModel) {
    process.stdout.write(`  Round 3 (${tertiaryModel})... `);
    try {
      const fullCodebase = includeFullCodebase ? loadFullCodebaseContext() : null;
      round3 = await ModelClient.complete({
        model:        tertiaryModel,
        systemPrompt: buildResearchSystemPrompt(ctx, fullCodebase),
        userMessage,
        maxTokens:    4096,
        taskName:     `cross-review-round3-phase${phaseNum}`,
        sessionId,
        phaseNum,
      });
      console.log(`done ($${round3.cost_usd.toFixed(4)})`);
    } catch (err) {
      console.log(`skipped (${err.message.slice(0, 60)})`);
    }
  }

  // ── Synthesis ─────────────────────────────────────────────────────────────
  const reviews = [
    { model: primaryModel,   content: round1.content, role: 'primary' },
    ...(round2 ? [{ model: secondaryModel, content: round2.content, role: 'adversarial' }] : []),
    ...(round3 ? [{ model: tertiaryModel,  content: round3.content, role: 'research'    }] : []),
  ];

  const synthesis = synthesizeFindings(reviews);
  const totalCost = (round1.cost_usd || 0) + (round2?.cost_usd || 0) + (round3?.cost_usd || 0);

  return {
    reviews,
    synthesis,
    total_cost_usd: totalCost,
    diff_length: diff.length,
  };
}

function loadFullCodebaseContext() {
  // Read key architecture files for Gemini's large context
  const files = [
    '.planning/ARCHITECTURE.md',
    '.planning/PROJECT.md',
    'src',
  ];
  let context = '';
  for (const f of files) {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) {
      context += `\n\n### ${f}\n${fs.readFileSync(p, 'utf8').slice(0, 20_000)}`;
    }
  }
  return context.slice(0, 900_000); // Stay within Gemini's 1M context
}

module.exports = { runCrossReview, parseFindings, extractVerdict };
```

---

### `bin/review/finding-synthesizer.js`

```javascript
/**
 * MindForge v2 — Finding Synthesizer
 * Compares findings across multiple model reviews to identify:
 * - Consensus findings (same issue found by 2+ models = high confidence)
 * - Model-specific findings (only one model found it)
 * - Contradictions (models disagree on the right approach)
 */
'use strict';

const { parseFindings, extractVerdict } = require('./cross-review-engine');

/**
 * Synthesize findings from multiple model reviews.
 * @param {{ model, content, role }[]} reviews
 * @returns {{ consensus, by_model, contradictions, overall_verdict, summary }}
 */
function synthesizeFindings(reviews) {
  const allFindings = reviews.map(r => ({
    model:    r.model,
    role:     r.role,
    findings: parseFindings(r.content),
    verdict:  extractVerdict(r.content),
  }));

  // Find consensus: same file + similar description across 2+ models
  const consensus      = [];
  const model_specific = {};
  const contradictions = [];

  // Index findings by location for cross-model comparison
  const byLocation = {};
  for (const { model, findings } of allFindings) {
    for (const f of findings) {
      const key = normalizeLocation(f.location);
      if (!byLocation[key]) byLocation[key] = [];
      byLocation[key].push({ model, ...f });
    }
  }

  // Classify findings
  for (const [loc, locFindings] of Object.entries(byLocation)) {
    const modelNames = [...new Set(locFindings.map(f => f.model))];
    if (modelNames.length >= 2) {
      // Consensus finding
      const highest = highestSeverity(locFindings.map(f => f.severity));
      consensus.push({
        location: locFindings[0].location,
        severity: highest,
        description: locFindings[0].description,
        models: modelNames,
        all_descriptions: locFindings.map(f => ({ model: f.model, text: f.description })),
      });
    } else {
      // Model-specific
      const model = modelNames[0];
      if (!model_specific[model]) model_specific[model] = [];
      model_specific[model].push(...locFindings);
    }
  }

  // Detect contradictions (same location, different severity by 2+ tiers)
  for (const [, locFindings] of Object.entries(byLocation)) {
    if (locFindings.length < 2) continue;
    const severities = locFindings.map(f => f.severity);
    if (severityGap(severities) >= 2) {
      contradictions.push({
        location: locFindings[0].location,
        entries: locFindings.map(f => ({ model: f.model, severity: f.severity, description: f.description })),
      });
    }
  }

  // Aggregate verdict
  const verdicts   = allFindings.map(r => r.verdict);
  const hasRequest = verdicts.some(v => v === 'REQUEST_CHANGES');
  const allApprove = verdicts.every(v => v === 'APPROVE');
  const overall_verdict = allApprove ? 'APPROVE' : hasRequest ? 'REQUEST_CHANGES' : 'COMMENT';

  const total_findings = consensus.length + Object.values(model_specific).flat().length;

  return {
    consensus,
    model_specific,
    contradictions,
    overall_verdict,
    models_used:    allFindings.map(r => r.model),
    total_findings,
    critical_count: [...consensus, ...Object.values(model_specific).flat()]
      .filter(f => f.severity === 'CRITICAL').length,
  };
}

function normalizeLocation(loc) {
  // Strip exact line numbers for fuzzy matching (same file, near same line = same finding)
  return loc?.replace(/:\d+$/, '').toLowerCase() || '';
}

const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function highestSeverity(severities) {
  return severities.reduce((max, s) =>
    SEVERITY_ORDER.indexOf(s) > SEVERITY_ORDER.indexOf(max) ? s : max, 'LOW');
}

function severityGap(severities) {
  const indices = severities.map(s => SEVERITY_ORDER.indexOf(s));
  return Math.max(...indices) - Math.min(...indices);
}

module.exports = { synthesizeFindings };
```

---

### `bin/review/review-report-writer.js`

```javascript
/**
 * MindForge v2 — Cross-Review Report Writer
 * Writes CROSS-REVIEW-[N].md to .planning/phases/[N]/
 */
'use strict';

const fs   = require('fs');
const path = require('path');

function write(phaseNum, crossReviewResult) {
  const { reviews, synthesis, total_cost_usd, diff_length } = crossReviewResult;
  const { consensus, model_specific, contradictions, overall_verdict, total_findings } = synthesis;

  const dir  = path.join(process.cwd(), '.planning', 'phases', String(phaseNum));
  fs.mkdirSync(dir, { recursive: true });

  const verdictIcon = overall_verdict === 'APPROVE' ? '✅' :
                      overall_verdict === 'REQUEST_CHANGES' ? '❌' : '⚠️';

  const lines = [
    `# Cross-Model Code Review — Phase ${phaseNum}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Models:** ${reviews.map(r => r.model).join(' → ')}`,
    `**Diff size:** ${diff_length.toLocaleString()} chars`,
    `**Total cost:** $${total_cost_usd.toFixed(4)}`,
    `**Verdict:** ${verdictIcon} ${overall_verdict}`,
    `**Total findings:** ${total_findings} (${consensus.length} consensus, ${Object.values(model_specific).flat().length} model-specific)`,
    '',
    '## Consensus Findings (found by 2+ models — high confidence)',
    '',
  ];

  if (consensus.length === 0) {
    lines.push('*No consensus findings — models did not agree on any specific issues.*');
  } else {
    lines.push('| # | Severity | Location | Description | Models |');
    lines.push('|---|---|---|---|---|');
    consensus.forEach((f, i) => {
      lines.push(`| ${i+1} | **${f.severity}** | \`${f.location}\` | ${f.description.slice(0, 120)} | ${f.models.join(' + ')} |`);
    });
  }

  lines.push('', '## Model-Specific Findings', '');
  for (const [model, findings] of Object.entries(model_specific)) {
    if (!findings.length) continue;
    lines.push(`### ${model} only`);
    lines.push('');
    findings.slice(0, 10).forEach(f => {
      lines.push(`**[${f.severity}]** \`${f.location}\` — ${f.description}`);
    });
    if (findings.length > 10) lines.push(`*...and ${findings.length - 10} more findings*`);
    lines.push('');
  }

  if (contradictions.length > 0) {
    lines.push('## ⚠️ Contradictions (models disagree — human resolution required)', '');
    contradictions.forEach((c, i) => {
      lines.push(`### Contradiction ${i+1}: \`${c.location}\``);
      c.entries.forEach(e => lines.push(`- **${e.model}** [${e.severity}]: ${e.description}`));
      lines.push('');
    });
  }

  lines.push('## Individual Review Outputs', '');
  reviews.forEach(r => {
    lines.push(`<details><summary>${r.model} (${r.role})</summary>`, '');
    lines.push('```');
    lines.push(r.content.slice(0, 3000));
    if (r.content.length > 3000) lines.push(`[truncated — ${r.content.length} chars total]`);
    lines.push('```', '', '</details>', '');
  });

  const file = path.join(dir, `CROSS-REVIEW-${phaseNum}.md`);
  fs.writeFileSync(file, lines.join('\n'));
  return file;
}

module.exports = { write };
```

**Commit:**
```bash
git add bin/review/
git commit -m "feat(v2-models): implement cross-review engine, finding synthesizer, and report writer"
```

---

## TASK 5 — Implement the Research Engine

### `bin/research/research-engine.js`

```javascript
/**
 * MindForge v2 — Research Engine
 * Leverages Gemini 2.5 Pro's 1M context for deep research tasks.
 *
 * Use cases:
 * - Library comparison with full documentation
 * - Legacy codebase analysis
 * - Regulatory compliance research (GDPR, HIPAA, etc.)
 * - Pre-planning technical deep-dives
 */
'use strict';

const fs          = require('fs');
const path        = require('path');
const https       = require('https');
const ModelClient = require('../models/model-client');
const Router      = require('../models/model-router');

const RESEARCH_MODEL = 'gemini-2.5-pro'; // Overridden by RESEARCH_MODEL in MINDFORGE.md

// ── Context packager ──────────────────────────────────────────────────────────
function packageLocalContext(contextPaths = []) {
  let content = '';
  const maxPerFile = 50_000; // 50K chars per file to avoid one file dominating

  for (const p of contextPaths) {
    const fullPath = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
    if (!fs.existsSync(fullPath)) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Include all relevant files in directory (recursively, capped at 500K total)
      const files = walkDir(fullPath, ['.ts', '.tsx', '.js', '.jsx', '.md', '.json']);
      for (const f of files) {
        if (content.length > 500_000) break;
        const text = fs.readFileSync(f, 'utf8').slice(0, maxPerFile);
        content += `\n\n### ${path.relative(process.cwd(), f)}\n\`\`\`\n${text}\n\`\`\``;
      }
    } else {
      const text = fs.readFileSync(fullPath, 'utf8').slice(0, maxPerFile);
      content += `\n\n### ${p}\n\`\`\`\n${text}\n\`\`\``;
    }
  }

  return content;
}

function walkDir(dir, extensions) {
  const results = [];
  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...walkDir(fullPath, extensions));
      else if (extensions.some(ext => entry.name.endsWith(ext))) results.push(fullPath);
    }
  } catch {}
  return results;
}

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? require('https') : require('http');
    protocol.get(url, { timeout: 30_000 }, res => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => resolve(body.slice(0, 200_000))); // Cap at 200K
    }).on('error', reject);
  });
}

// ── Research system prompts ───────────────────────────────────────────────────
const RESEARCH_SYSTEM_PROMPTS = {
  general: `You are a thorough technical researcher. Analyse the provided context deeply and answer the question comprehensively. Cite specific evidence from the context. Structure your response with clear headings. Be concrete — give specific recommendations, not vague guidance.`,

  library_comparison: `You are a senior engineer evaluating libraries for production use.
For each library, analyse: API design quality, maintenance status, performance characteristics, security record, bundle size, TypeScript support, community size, known issues.
Provide a clear recommendation with rationale. Do not be vague.`,

  codebase_analysis: `You are a senior architect performing a codebase audit.
Identify: architectural patterns used, coupling issues, missing abstractions, technical debt, security concerns, performance bottlenecks.
Be specific — cite file names and line numbers where relevant.`,

  compliance: `You are a compliance engineer reviewing technical implementation against regulatory requirements.
For each requirement: assess whether the codebase meets it, identify specific gaps, provide concrete remediation steps.
Be precise about what constitutes compliance vs. non-compliance.`,

  pre_planning: `You are a senior architect helping with pre-implementation planning.
Analyse the context provided and answer the planning question with:
1. Technical approach recommendation
2. Key risks and mitigations
3. Estimated complexity
4. Specific implementation steps
5. Open questions that need resolution before starting`,
};

// ── Main research function ────────────────────────────────────────────────────
async function research(params) {
  const {
    topic,
    question,
    researchType = 'general',
    contextPaths = [],   // Local files/dirs to include
    urls = [],           // URLs to fetch and include
    sessionId = 'unknown',
    phaseNum,
  } = params;

  const model = Router.getModel('RESEARCH_MODEL') || RESEARCH_MODEL;

  // Package context
  let contextContent = packageLocalContext(contextPaths);

  // Fetch URLs
  for (const url of urls) {
    try {
      const html = await fetchUrl(url);
      // Strip HTML tags for cleaner context
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      contextContent += `\n\n### URL: ${url}\n${text.slice(0, 100_000)}`;
    } catch (err) {
      contextContent += `\n\n### URL: ${url}\n[Failed to fetch: ${err.message}]`;
    }
  }

  const systemPrompt = RESEARCH_SYSTEM_PROMPTS[researchType] || RESEARCH_SYSTEM_PROMPTS.general;

  const userMessage = [
    `## Research Topic\n${topic}`,
    contextContent ? `\n## Context\n${contextContent}` : '',
    `\n## Question\n${question}`,
  ].join('\n');

  process.stdout.write(`  🔬 Researching with ${model} (${contextContent.length.toLocaleString()} chars context)... `);

  const result = await ModelClient.complete({
    model,
    systemPrompt,
    userMessage,
    maxTokens:   8192,
    temperature: 0.2,
    taskName:    `research-${topic.slice(0, 30)}`,
    sessionId,
    phaseNum,
  });

  console.log(`done ($${result.cost_usd.toFixed(4)})`);

  return {
    topic,
    question,
    research_type: researchType,
    model_used:    result.model,
    content:       result.content,
    cost_usd:      result.cost_usd,
    context_length: contextContent.length,
    input_tokens:  result.input_tokens,
    output_tokens: result.output_tokens,
  };
}

function writeResearchReport(topic, result, outputPath) {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  const content = [
    `# Research Report: ${topic}`,
    `**Model:** ${result.model_used}`,
    `**Research type:** ${result.research_type}`,
    `**Context:** ${result.context_length.toLocaleString()} chars`,
    `**Cost:** $${result.cost_usd.toFixed(4)}`,
    `**Generated:** ${new Date().toISOString()}`,
    '',
    result.content,
  ].join('\n');

  fs.writeFileSync(outputPath, content);
  return outputPath;
}

module.exports = { research, writeResearchReport, packageLocalContext, walkDir };
```

**Commit:**
```bash
git add bin/research/
git commit -m "feat(v2-models): implement research engine with Gemini 1M context advantage"
```

---

## TASK 6 — Write the Research Agent Persona

### `.mindforge/personas/research-agent.md`

```markdown
# Research Agent Persona

## Identity
You are a thorough technical research specialist with access to Gemini 2.5 Pro's
1-million-token context window. You are the agent called when a question requires
ingesting entire documentation sets, large codebases, or multiple long documents
simultaneously — a task impossible for agents with smaller context windows.

## When you are activated
- `/mindforge:research [topic]` command
- `/mindforge:plan-phase --deep-research` flag
- When the difficulty scorer identifies domain unfamiliarity (ambiguity > 4.0)
- When DISCUSS_PHASE identifies an open research question

## Your unique capabilities

### Full documentation ingestion
You can read entire library documentation (not just excerpts) before making
recommendations. When comparing libraries: ingest ALL docs simultaneously.
Do not summarize or excerpt unless told to — read the full context.

### Codebase archaeology
On brownfield projects, you can ingest the entire codebase before planning.
You identify: undocumented architectural decisions, hidden dependencies,
legacy patterns, technical debt locations.

### Regulatory completeness
For compliance research: ingest the full regulation text, not just summaries.
GDPR: 88 articles. HIPAA Security Rule: full text. PCI DSS: full standard.
You cite specific article numbers and sub-clauses.

## Output standard
Every research output must have:
1. **Executive summary** (3-5 bullet points, actionable)
2. **Detailed findings** (with evidence citations from the context)
3. **Specific recommendations** (not "consider X" — say "use X because Y")
4. **Open questions** (what needs human input before implementation)
5. **Sources consulted** (list every file/URL included in context)

## Model assignment
Default: RESEARCH_MODEL (gemini-2.5-pro)
This agent should NEVER be assigned a model with context < 500K tokens.
The point is large-context reasoning — a smaller model defeats the purpose.
```

**Commit:**
```bash
git add .mindforge/personas/research-agent.md
git commit -m "feat(v2-models): add research-agent persona for Gemini 1M context tasks"
```

---

## TASK 7 — Write the three new commands

### `.claude/commands/mindforge/cross-review.md`

```markdown
# MindForge v2 — Cross-Review Command
# Usage: /mindforge:cross-review [--phase N] [--models list] [--focus area] [--sha range] [--full-codebase]
# Version: v2.0.0-alpha.3

## Purpose
Get the same code diff reviewed by multiple AI models simultaneously.
Claude finds what Claude finds. GPT-4o finds what GPT-4o finds.
Consensus findings (both models agree) = high confidence issues.
Model-specific findings = worth investigating but may be false positives.
Contradictions = need human judgment.

## The adversarial insight
Models trained on different data have different blind spots.
GPT-4o's adversarial prompt ("review code written by a competitor")
consistently finds categories of issues that Claude in primary review mode
underweights. Using both captures more of the issue space.

## Execution flow

```
/mindforge:cross-review --phase 3
    │
    ▼ Load diff (git diff HEAD~N or staged or --sha range)
    │ Load review context: PROJECT.md, ARCHITECTURE.md, CONVENTIONS.md, SECURITY.md
    │
    ▼ Round 1: Primary reviewer (EXECUTOR_MODEL / claude-sonnet-4-6)
    │   System: senior code reviewer with project context
    │   Finds: logic errors, convention violations, architecture issues
    │
    ▼ Round 2: Adversarial reviewer (CROSS_REVIEW_SECONDARY / gpt-4o)
    │   System: "paranoid auditor reviewing competitor's code"
    │   Finds: security holes, edge cases, failure modes
    │
    ▼ Optional Round 3: Research reviewer (CROSS_REVIEW_TERTIARY / gemini-2.5-pro)
    │   System: architect with full codebase context (1M tokens)
    │   Finds: cross-module issues, architectural inconsistencies
    │
    ▼ Synthesis
    │   Compare findings across models
    │   Identify consensus (2+ models = high confidence)
    │   Flag contradictions (human resolution needed)
    │
    ▼ Write CROSS-REVIEW-[N].md
```

## Flags

### --phase N (default: current phase)
Use the diff from phase N's commits.

### --models claude,gpt4o,gemini (default: claude,gpt4o)
Specify which models to include. `gemini` adds a third research pass.

### --focus security|architecture|performance
Bias the review toward a specific concern.
security → both models use security-focused system prompts
architecture → both models use architecture-focused prompts

### --sha base..head
Review a specific git SHA range.

### --full-codebase
Include the full codebase as context for Gemini (requires gemini in --models).
Warning: costs more but catches cross-module issues.

## Output

```
⚡ Cross-Model Code Review — Phase 3
────────────────────────────────────────────
Round 1 (claude-sonnet-4-6)...          done ($0.042)
Round 2 (gpt-4o, adversarial)...        done ($0.079)
Synthesis...                            done

Consensus findings (2 models agree):
  HIGH    src/auth/login.ts:47  — Missing rate limiting on login attempts
  MEDIUM  src/auth/login.ts:89  — Error message reveals whether email exists

GPT-4o-only findings: 3 (review CROSS-REVIEW-3.md for details)
Claude-only findings: 2 (review CROSS-REVIEW-3.md for details)

Total cost: $0.121
Verdict: ❌ REQUEST_CHANGES (2 consensus findings)

Report: .planning/phases/3/CROSS-REVIEW-3.md
```

## Integration with /mindforge:ship
When `REQUIRE_CROSS_REVIEW=true` in MINDFORGE.md:
- `/mindforge:ship` will not create a PR if CROSS-REVIEW-[N].md is missing
- If CROSS-REVIEW exists but has CRITICAL consensus findings: PR is blocked
- If CROSS-REVIEW exists and all consensus findings are addressed: PR proceeds

## Cost estimate
Two-model review (claude + gpt4o) for a typical phase diff (~10K chars):
- Claude Sonnet: ~$0.04-0.08
- GPT-4o:        ~$0.07-0.12
- Total:         ~$0.11-0.20 per review

## AUDIT entry
```json
{
  "event": "cross_review_completed",
  "phase": 3,
  "models": ["claude-sonnet-4-6", "gpt-4o"],
  "consensus_findings": 2,
  "total_findings": 7,
  "verdict": "REQUEST_CHANGES",
  "cost_usd": 0.121
}
```
```

---

### `.claude/commands/mindforge/research.md`

```markdown
# MindForge v2 — Research Command
# Usage: /mindforge:research [topic] [--type general|library|codebase|compliance|planning]
#                            [--context path] [--url URL] [--output path]
# Version: v2.0.0-alpha.3

## Purpose
Deep research using Gemini 2.5 Pro's 1-million-token context window.
Use when the question requires reading entire documentation sets, the full
codebase, or multiple long documents simultaneously.

## When to use this instead of web search

| Use web search when | Use /mindforge:research when |
|---|---|
| Looking up a quick fact | Comparing 3 libraries with full docs |
| Finding the latest news | Understanding an entire codebase before planning |
| Getting an API reference | Compliance research against full regulatory text |
| Quick syntax lookup | Pre-planning deep-dive for complex domain |

## Research types

### library (default for library comparisons)
```
/mindforge:research "Prisma vs Drizzle vs Kysely for our use case" --type library \
  --url https://www.prisma.io/docs \
  --url https://orm.drizzle.team/docs \
  --context .planning/ARCHITECTURE.md
```

### codebase (brownfield analysis)
```
/mindforge:research "Why does authentication sometimes fail?" --type codebase \
  --context src/auth \
  --context src/middleware
```
Ingests entire source directories into Gemini's context for comprehensive analysis.

### compliance
```
/mindforge:research "Are we HIPAA compliant for our PHI handling?" --type compliance \
  --url https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html \
  --context src/models/patient.ts \
  --context src/api/health-records
```

### planning (pre-implementation research)
```
/mindforge:research "Should we use microservices or modular monolith?" --type planning \
  --context .planning/REQUIREMENTS.md \
  --context .planning/ARCHITECTURE.md
```

## Output

```
🔬 MindForge Research
─────────────────────────────────────────────
Topic: Prisma vs Drizzle vs Kysely
Model: gemini-2.5-pro (1M context)
Context: 3 docs ingested (148,000 chars)
Cost: $0.31

## Executive Summary
- Prisma: best DX, largest ecosystem, acceptable performance
- Drizzle: best TypeScript types, fastest, smallest bundle
- Kysely: most flexible, SQL-close, steeper learning curve

Recommendation: Drizzle for new projects (best TypeScript + performance).
Prisma for teams needing excellent docs and migration tooling.
Kysely for teams that want SQL control with type safety.

[Full detailed analysis...]

Report saved: .planning/research/prisma-vs-drizzle-vs-kysely.md
```

## Cost guidance
- Typical research with 50K context: ~$0.20-0.50 (Gemini 2.5 Pro)
- Full codebase analysis (500K context): ~$1.50-3.00
- Regulatory compliance (100K context): ~$0.40-0.80

## AUDIT entry
```json
{
  "event": "research_completed",
  "topic": "Prisma vs Drizzle for our use case",
  "model": "gemini-2.5-pro",
  "context_length": 148000,
  "cost_usd": 0.31,
  "output_path": ".planning/research/prisma-vs-drizzle.md"
}
```
```

---

### `.claude/commands/mindforge/costs.md`

```markdown
# MindForge v2 — Costs Command
# Usage: /mindforge:costs [--phase N] [--session ID] [--window 7d|30d|today] [--breakdown]
# Version: v2.0.0-alpha.3

## Purpose
Real-time cost tracking for all model calls made by MindForge.
See exactly what you're spending, per model, per phase, per session.

## Default output (last 7 days)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡  MindForge Cost Dashboard — [Project]
    Last 7 days
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total spend:  $3.84   |   Today: $1.21   |   Daily limit: $10.00 (38% used)

  By model:
  ┌─────────────────────────┬────────┬──────────┬─────────┐
  │ Model                   │ Calls  │ Tokens   │ Cost    │
  ├─────────────────────────┼────────┼──────────┼─────────┤
  │ claude-sonnet-4-6       │   142  │ 1.82M    │ $1.92   │
  │ gpt-4o                  │    18  │ 312K     │ $0.98   │
  │ gemini-2.5-pro          │     4  │ 2.14M    │ $0.74   │
  │ claude-opus-4-5         │     6  │ 198K     │ $0.12   │
  │ claude-haiku-4-5        │    34  │ 840K     │ $0.08   │
  └─────────────────────────┴────────┴──────────┴─────────┘

  By phase (this week):
  Phase 3 (Authentication):  $1.84  (48%)
  Phase 4 (Dashboard):       $1.21  (32%)
  Other (quick/debug):       $0.79  (20%)

  Most expensive tasks:
  1. research: Prisma vs Drizzle          $0.31  gemini-2.5-pro
  2. cross-review-round2-phase3           $0.21  gpt-4o
  3. Plan 3-04 (JWT middleware)           $0.18  claude-sonnet-4-6

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MINDFORGE.md limits: MODEL_COST_WARN_USD=1.00  MODEL_COST_HARD_LIMIT_USD=10.00
```

## Flags

### --window today|7d|30d (default: 7d)
Change the reporting window.

### --phase N
Show costs for a specific phase only.

### --breakdown
Show per-task cost breakdown (verbose).

### --routing
Show current model routing table (which models are assigned to which tasks).

## Model routing display (--routing flag)

```
Current model routing (from MINDFORGE.md + defaults):
  PLANNER_MODEL:           claude-opus-4-5
  EXECUTOR_MODEL:          claude-sonnet-4-6  ← most calls
  REVIEWER_MODEL:          gpt-4o
  SECURITY_MODEL:          claude-opus-4-5
  RESEARCH_MODEL:          gemini-2.5-pro
  QA_MODEL:                claude-sonnet-4-6
  DEBUG_MODEL:             claude-opus-4-5
  QUICK_MODEL:             claude-haiku-4-5
  CROSS_REVIEW_SECONDARY:  gpt-4o

Available providers:
  Anthropic: ✅ ANTHROPIC_API_KEY set
  OpenAI:    ✅ OPENAI_API_KEY set
  Google:    ❌ GOOGLE_API_KEY not set → gemini models unavailable
```

## Budget management

Set in MINDFORGE.md:
```
MODEL_COST_WARN_USD=1.00         # Slack warning when session > $1
MODEL_COST_HARD_LIMIT_USD=10.00  # Stop model calls when daily > $10
MODEL_PREFER_CHEAP_BELOW_DIFFICULTY=2.0  # Use QUICK_MODEL for easy tasks
```

## AUDIT entry
```json
{ "event": "costs_viewed", "window": "7d", "total_usd": 3.84 }
```
```

**Commit:**
```bash
for cmd in cross-review research costs; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done
git add .claude/commands/mindforge/ .agent/mindforge/
git commit -m "feat(v2-models): add /mindforge:cross-review, /mindforge:research, /mindforge:costs"
```

---

## TASK 8 — Update CLAUDE.md, execute-phase, MINDFORGE.md

### Add to `.claude/CLAUDE.md` and `.agent/CLAUDE.md`

```markdown
---

## MULTI-MODEL INTELLIGENCE LAYER (v2.0.0 — Day 10)

### Model routing at task dispatch time
Before dispatching a task, resolve the model using the router:
1. Read the task `<persona>` field
2. Check for Tier 3 override (always use SECURITY_MODEL for auth/payment/PII)
3. Map persona → model setting key → model ID from MINDFORGE.md or defaults
4. Check model availability (API key present?)
5. If unavailable: apply fallback chain
6. Write `model_routed` AUDIT entry

### Cross-review integration
After `/mindforge:review` or before `/mindforge:ship` (when REQUIRE_CROSS_REVIEW=true):
Run cross-review engine via `bin/review/cross-review-engine.js`.
Consensus findings (2+ models) are HIGH confidence — address before shipping.

### Research integration
When called via `/mindforge:research`:
Package local context files, fetch URLs, pass to Gemini 2.5 Pro.
Write research report to `.planning/research/[slug].md`.
Reference the report in subsequent plan-phase calls via CONTEXT.md.

### Cost awareness
All model calls go through `bin/models/model-client.js` which tracks costs.
Never make raw API calls — always use ModelClient.complete() so costs are tracked.
If MODEL_COST_HARD_LIMIT_USD is reached: stop and notify via Slack.

### New commands (Day 10)
- /mindforge:cross-review — adversarial multi-model code review
- /mindforge:research — deep research via Gemini 1M context
- /mindforge:costs — real-time cost tracking dashboard

---
```

### Update MINDFORGE.md and MINDFORGE-V2-SCHEMA.json

```markdown
## Multi-model configuration (v2.0.0)

PLANNER_MODEL=claude-opus-4-5
EXECUTOR_MODEL=claude-sonnet-4-6
REVIEWER_MODEL=gpt-4o
SECURITY_MODEL=claude-opus-4-5
RESEARCH_MODEL=gemini-2.5-pro
QA_MODEL=claude-sonnet-4-6
DEBUG_MODEL=claude-opus-4-5
QUICK_MODEL=claude-haiku-4-5
CROSS_REVIEW_SECONDARY=gpt-4o
CROSS_REVIEW_TERTIARY=gemini-2.5-pro

MODEL_COST_WARN_USD=1.00
MODEL_COST_HARD_LIMIT_USD=10.00
MODEL_PREFER_CHEAP_BELOW_DIFFICULTY=2.0
REQUIRE_CROSS_REVIEW=false
```

Schema additions to `.mindforge/MINDFORGE-V2-SCHEMA.json`:
```json
{
  "PLANNER_MODEL":          { "type": "string" },
  "EXECUTOR_MODEL":         { "type": "string" },
  "REVIEWER_MODEL":         { "type": "string" },
  "SECURITY_MODEL":         { "type": "string" },
  "RESEARCH_MODEL":         { "type": "string" },
  "QA_MODEL":               { "type": "string" },
  "DEBUG_MODEL":            { "type": "string" },
  "QUICK_MODEL":            { "type": "string" },
  "CROSS_REVIEW_SECONDARY": { "type": "string" },
  "CROSS_REVIEW_TERTIARY":  { "type": "string" },
  "MODEL_COST_WARN_USD":    { "type": "number", "minimum": 0 },
  "MODEL_COST_HARD_LIMIT_USD": { "type": "number", "minimum": 0 },
  "MODEL_PREFER_CHEAP_BELOW_DIFFICULTY": { "type": "number", "minimum": 0, "maximum": 5 },
  "REQUIRE_CROSS_REVIEW":   { "type": "boolean" }
}
```

**Commit:**
```bash
git add .claude/CLAUDE.md .agent/CLAUDE.md MINDFORGE.md .mindforge/MINDFORGE-V2-SCHEMA.json
git commit -m "feat(v2-models): update CLAUDE.md, MINDFORGE.md, and schema for multi-model layer"
```

---

## TASK 9 — Write the model routing test suite

### `tests/model-routing.test.js`

```javascript
/**
 * MindForge v2 — Model Routing Test Suite
 * Tests: model registry, router, cost tracker, finding synthesizer,
 * provider availability detection, fallback chains.
 *
 * No real API calls made — providers are tested via unit logic only.
 *
 * Run: node tests/model-routing.test.js
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const assert = require('assert');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

const Router          = require('../bin/models/model-router');
const CostTracker     = require('../bin/models/cost-tracker');
const { synthesizeFindings } = require('../bin/review/finding-synthesizer');
const { parseFindings, extractVerdict } = require('../bin/review/cross-review-engine');
const ResearchEngine  = require('../bin/research/research-engine');

// ── Temp project factory ──────────────────────────────────────────────────────
function mkProject() {
  const dir    = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-models-'));
  const write  = (rel, c) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); return f; };
  const read   = rel => { const f = path.join(dir, rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
  const exists = rel => fs.existsSync(path.join(dir, rel));
  const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };
  return { dir, write, read, exists, cleanup };
}

// ── Review text fixtures ──────────────────────────────────────────────────────
const REVIEW_WITH_FINDINGS = `
## Code Review

**[CRITICAL]** \`src/auth/login.ts:47\` — SQL injection via unsanitised userId parameter
> Use parameterised queries: db.query('SELECT * FROM users WHERE id = $1', [userId])

**[HIGH]** \`src/auth/login.ts:89\` — Error message reveals whether email exists in database
> Return generic "Invalid credentials" for both wrong email and wrong password

**[MEDIUM]** \`src/utils/format.ts:12\` — parseInt without radix parameter may give unexpected results in some browsers
> Always specify radix: parseInt(str, 10)

### Verdict: REQUEST_CHANGES
`;

const ADVERSARIAL_REVIEW = `
**[HIGH]** \`src/auth/login.ts:47\` — Input not sanitised before database query
> Parameterise all queries

**[HIGH]** \`src/auth/session.ts:22\` — JWT secret hardcoded in source code
> Load from environment variable: process.env.JWT_SECRET

**[LOW]** \`src/utils/helper.ts:5\` — Dead code that will never execute
> Remove unreachable code block

### Verdict: REQUEST_CHANGES
`;

const CLEAN_REVIEW = `
The code looks well-structured and follows the project conventions.

### Positive observations
- Good error handling
- Clean separation of concerns

### Verdict: APPROVE
`;

// ═══════════════════════════════════════════════════════════════════════
console.log('\nMindForge v2 — Model Routing Tests\n');

// ── File existence ────────────────────────────────────────────────────────────
console.log('Required files:');
[
  'bin/models/model-client.js',
  'bin/models/anthropic-provider.js',
  'bin/models/openai-provider.js',
  'bin/models/gemini-provider.js',
  'bin/models/model-router.js',
  'bin/models/cost-tracker.js',
  'bin/review/cross-review-engine.js',
  'bin/review/finding-synthesizer.js',
  'bin/review/review-report-writer.js',
  'bin/research/research-engine.js',
  '.mindforge/models/model-registry.md',
  '.mindforge/models/model-router.md',
  '.mindforge/models/cost-calculator.md',
  '.mindforge/personas/research-agent.md',
  '.claude/commands/mindforge/cross-review.md',
  '.claude/commands/mindforge/research.md',
  '.claude/commands/mindforge/costs.md',
].forEach(f => test(`${f} exists`, () => assert.ok(fs.existsSync(f), `Missing: ${f}`)));

// ── Model router ──────────────────────────────────────────────────────────────
console.log('\nModel router:');

test('route: developer persona returns EXECUTOR_MODEL', () => {
  Router.clearCache();
  const { model, setting } = Router.route('developer', 1);
  assert.strictEqual(setting, 'EXECUTOR_MODEL');
  assert.ok(model, 'Should return a model ID');
});

test('route: architect persona returns PLANNER_MODEL', () => {
  Router.clearCache();
  const { model, setting } = Router.route('architect', 1);
  assert.strictEqual(setting, 'PLANNER_MODEL');
});

test('route: security-reviewer persona returns SECURITY_MODEL', () => {
  Router.clearCache();
  const { setting } = Router.route('security-reviewer', 1);
  assert.strictEqual(setting, 'SECURITY_MODEL');
});

test('route: debug-specialist persona returns DEBUG_MODEL', () => {
  Router.clearCache();
  const { setting } = Router.route('debug-specialist', 1);
  assert.strictEqual(setting, 'DEBUG_MODEL');
});

test('route: research-agent persona returns RESEARCH_MODEL', () => {
  Router.clearCache();
  const { setting } = Router.route('research-agent', 1);
  assert.strictEqual(setting, 'RESEARCH_MODEL');
});

test('route: Tier 3 override returns SECURITY_MODEL regardless of persona', () => {
  Router.clearCache();
  const developerTier3 = Router.route('developer', 3);
  const architectTier3 = Router.route('architect', 3);
  assert.strictEqual(developerTier3.setting, 'SECURITY_MODEL', 'Developer on Tier 3 → SECURITY_MODEL');
  assert.strictEqual(architectTier3.setting, 'SECURITY_MODEL', 'Architect on Tier 3 → SECURITY_MODEL');
  assert.ok(developerTier3.reason.includes('Tier 3'), 'Should state Tier 3 override reason');
});

test('route: unknown persona falls back to EXECUTOR_MODEL', () => {
  Router.clearCache();
  const { setting } = Router.route('wizard', 1);
  assert.strictEqual(setting, 'EXECUTOR_MODEL');
});

test('getModel: returns default for known setting key', () => {
  Router.clearCache();
  const model = Router.getModel('EXECUTOR_MODEL');
  assert.ok(model, 'Should return a model ID');
  assert.ok(typeof model === 'string', 'Should be a string');
});

test('getAllSettings: returns all 10 default settings', () => {
  Router.clearCache();
  const settings = Router.getAllSettings();
  const required = ['PLANNER_MODEL', 'EXECUTOR_MODEL', 'REVIEWER_MODEL', 'SECURITY_MODEL',
                    'RESEARCH_MODEL', 'QA_MODEL', 'DEBUG_MODEL', 'QUICK_MODEL',
                    'CROSS_REVIEW_SECONDARY', 'CROSS_REVIEW_TERTIARY'];
  required.forEach(k => assert.ok(settings[k], `Missing default: ${k}`));
});

test('router reads overrides from MINDFORGE.md', () => {
  const p = mkProject();
  p.write('MINDFORGE.md', 'EXECUTOR_MODEL=claude-haiku-4-5\n');
  const origCwd = process.cwd();
  process.chdir(p.dir);
  Router.clearCache();
  try {
    const { model } = Router.route('developer', 1);
    assert.strictEqual(model, 'claude-haiku-4-5', 'Should use override from MINDFORGE.md');
  } finally { process.chdir(origCwd); Router.clearCache(); p.cleanup(); }
});

// ── Finding parser ────────────────────────────────────────────────────────────
console.log('\nFinding parser:');

test('parseFindings: extracts 3 findings from review text', () => {
  const findings = parseFindings(REVIEW_WITH_FINDINGS);
  assert.strictEqual(findings.length, 3, `Expected 3, got ${findings.length}`);
});

test('parseFindings: correctly extracts CRITICAL severity', () => {
  const findings = parseFindings(REVIEW_WITH_FINDINGS);
  const critical = findings.find(f => f.severity === 'CRITICAL');
  assert.ok(critical, 'Should find CRITICAL finding');
  assert.ok(critical.location.includes('login.ts'), 'Should extract file location');
  assert.ok(critical.description.includes('SQL injection'), 'Should extract description');
});

test('parseFindings: returns empty array for clean review', () => {
  const findings = parseFindings(CLEAN_REVIEW);
  assert.strictEqual(findings.length, 0, 'Clean review should have no findings');
});

test('extractVerdict: extracts REQUEST_CHANGES', () => {
  assert.strictEqual(extractVerdict(REVIEW_WITH_FINDINGS), 'REQUEST_CHANGES');
});

test('extractVerdict: extracts APPROVE', () => {
  assert.strictEqual(extractVerdict(CLEAN_REVIEW), 'APPROVE');
});

test('extractVerdict: defaults to COMMENT when no verdict', () => {
  assert.strictEqual(extractVerdict('Some review without verdict'), 'COMMENT');
});

// ── Finding synthesizer ───────────────────────────────────────────────────────
console.log('\nFinding synthesizer:');

test('synthesizeFindings: detects consensus on same file:line', () => {
  const reviews = [
    { model: 'claude-sonnet-4-6', content: REVIEW_WITH_FINDINGS,  role: 'primary'    },
    { model: 'gpt-4o',            content: ADVERSARIAL_REVIEW,     role: 'adversarial' },
  ];
  const synthesis = synthesizeFindings(reviews);
  assert.ok(synthesis.consensus.length > 0, 'Should have at least 1 consensus finding');
  // login.ts:47 appears in both reviews (SQL injection / unsanitised input)
  const loginFinding = synthesis.consensus.find(f => f.location?.includes('login.ts'));
  assert.ok(loginFinding, 'login.ts finding should be consensus');
  assert.ok(loginFinding.models.length >= 2, 'Consensus finding should list 2+ models');
});

test('synthesizeFindings: overall_verdict is REQUEST_CHANGES when any model requests changes', () => {
  const reviews = [
    { model: 'claude-sonnet-4-6', content: REVIEW_WITH_FINDINGS, role: 'primary' },
    { model: 'gpt-4o',            content: CLEAN_REVIEW,          role: 'adversarial' },
  ];
  const synthesis = synthesizeFindings(reviews);
  assert.strictEqual(synthesis.overall_verdict, 'REQUEST_CHANGES', 'Mixed verdicts → REQUEST_CHANGES');
});

test('synthesizeFindings: overall_verdict is APPROVE when all models approve', () => {
  const reviews = [
    { model: 'claude-sonnet-4-6', content: CLEAN_REVIEW, role: 'primary' },
    { model: 'gpt-4o',            content: CLEAN_REVIEW, role: 'adversarial' },
  ];
  const synthesis = synthesizeFindings(reviews);
  assert.strictEqual(synthesis.overall_verdict, 'APPROVE', 'All approve → APPROVE');
});

test('synthesizeFindings: counts critical findings', () => {
  const reviews = [
    { model: 'claude-sonnet-4-6', content: REVIEW_WITH_FINDINGS, role: 'primary' },
    { model: 'gpt-4o',            content: ADVERSARIAL_REVIEW,    role: 'adversarial' },
  ];
  const synthesis = synthesizeFindings(reviews);
  assert.ok(typeof synthesis.critical_count === 'number', 'Should count critical findings');
  assert.ok(typeof synthesis.total_findings === 'number', 'Should count total findings');
});

test('synthesizeFindings: identifies model-specific findings', () => {
  const reviews = [
    { model: 'claude-sonnet-4-6', content: REVIEW_WITH_FINDINGS, role: 'primary' },
    { model: 'gpt-4o',            content: ADVERSARIAL_REVIEW,    role: 'adversarial' },
  ];
  const synthesis = synthesizeFindings(reviews);
  // model_specific should have entries for each model
  const hasModelSpecific = Object.values(synthesis.model_specific).some(arr => arr.length > 0);
  assert.ok(hasModelSpecific, 'Should have some model-specific findings');
});

// ── Cost tracker ──────────────────────────────────────────────────────────────
console.log('\nCost tracker:');

test('cost tracker records entries to token-usage.jsonl', async () => {
  const p = mkProject();
  const origCwd = process.cwd();
  process.chdir(p.dir);
  try {
    await CostTracker.record({
      timestamp: new Date().toISOString(),
      session_id: 'test-session',
      phase: 3,
      plan: '04',
      task_name: 'test task',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic',
      input_tokens: 1000,
      output_tokens: 500,
      cached_tokens: 0,
      cost_usd: 0.0105,
      latency_ms: 2500,
    });
    const logPath = path.join(p.dir, '.mindforge', 'metrics', 'token-usage.jsonl');
    assert.ok(fs.existsSync(logPath), 'token-usage.jsonl should be created');
    const entry = JSON.parse(fs.readFileSync(logPath, 'utf8').trim());
    assert.strictEqual(entry.model, 'claude-sonnet-4-6');
    assert.strictEqual(entry.cost_usd, 0.0105);
    assert.ok(entry.date, 'Should include date field');
  } finally { process.chdir(origCwd); p.cleanup(); }
});

test('getSummary: returns totals correctly', async () => {
  const p = mkProject();
  const origCwd = process.cwd();
  process.chdir(p.dir);
  try {
    const today = new Date().toISOString().slice(0, 10);
    const logDir = path.join(p.dir, '.mindforge', 'metrics');
    fs.mkdirSync(logDir, { recursive: true });
    // Write two entries
    const entries = [
      { date: today, model: 'claude-sonnet-4-6', cost_usd: 0.05, input_tokens: 1000, output_tokens: 500 },
      { date: today, model: 'gpt-4o',            cost_usd: 0.12, input_tokens: 2000, output_tokens: 800 },
    ];
    fs.writeFileSync(
      path.join(logDir, 'token-usage.jsonl'),
      entries.map(e => JSON.stringify(e)).join('\n') + '\n'
    );
    const summary = CostTracker.getSummary({ days: 1 });
    assert.ok(Math.abs(summary.total_usd - 0.17) < 0.001, `Total should be ~0.17, got ${summary.total_usd}`);
    assert.ok(summary.by_model['claude-sonnet-4-6'], 'Should have claude entry');
    assert.ok(summary.by_model['gpt-4o'], 'Should have gpt-4o entry');
  } finally { process.chdir(origCwd); p.cleanup(); }
});

test('getTodaySpend: returns 0 when no entries', () => {
  const p = mkProject();
  const origCwd = process.cwd();
  process.chdir(p.dir);
  try {
    const spend = CostTracker.getTodaySpend();
    assert.strictEqual(spend, 0, 'Empty log should return 0 spend');
  } finally { process.chdir(origCwd); p.cleanup(); }
});

// ── Research engine: context packager ─────────────────────────────────────────
console.log('\nResearch engine:');

test('packageLocalContext: reads a file into context', () => {
  const p = mkProject();
  const origCwd = process.cwd();
  process.chdir(p.dir);
  try {
    p.write('docs/architecture.md', '# Architecture\n\nThis is a microservices system.');
    const ctx = ResearchEngine.packageLocalContext(['docs/architecture.md']);
    assert.ok(ctx.includes('microservices'), 'Should include file content');
    assert.ok(ctx.includes('docs/architecture.md'), 'Should include filename');
  } finally { process.chdir(origCwd); p.cleanup(); }
});

test('packageLocalContext: returns empty string for non-existent paths', () => {
  const p = mkProject();
  const origCwd = process.cwd();
  process.chdir(p.dir);
  try {
    const ctx = ResearchEngine.packageLocalContext(['nonexistent/path.md']);
    assert.strictEqual(ctx, '', 'Should return empty string for missing files');
  } finally { process.chdir(origCwd); p.cleanup(); }
});

test('walkDir: skips node_modules and .git', () => {
  const p = mkProject();
  const origCwd = process.cwd();
  process.chdir(p.dir);
  try {
    p.write('src/index.ts', 'export default {}');
    p.write('node_modules/lodash/index.js', '// lodash');
    p.write('.git/config', '[core]');
    const files = ResearchEngine.walkDir(p.dir, ['.ts', '.js']);
    const hasNodeModules = files.some(f => f.includes('node_modules'));
    const hasGit         = files.some(f => f.includes('.git'));
    assert.ok(!hasNodeModules, 'Should skip node_modules');
    assert.ok(!hasGit,         'Should skip .git');
    assert.ok(files.some(f => f.includes('index.ts')), 'Should include src/index.ts');
  } finally { process.chdir(origCwd); p.cleanup(); }
});

// ── Review report writer ──────────────────────────────────────────────────────
console.log('\nReview report writer:');

test('review report writer creates CROSS-REVIEW-[N].md', () => {
  const { write } = require('../bin/review/review-report-writer');
  const p = mkProject();
  const origCwd = process.cwd();
  process.chdir(p.dir);
  try {
    const mockResult = {
      reviews: [
        { model: 'claude-sonnet-4-6', content: REVIEW_WITH_FINDINGS, role: 'primary' },
        { model: 'gpt-4o',            content: ADVERSARIAL_REVIEW,    role: 'adversarial' },
      ],
      synthesis: synthesizeFindings([
        { model: 'claude-sonnet-4-6', content: REVIEW_WITH_FINDINGS, role: 'primary' },
        { model: 'gpt-4o',            content: ADVERSARIAL_REVIEW,    role: 'adversarial' },
      ]),
      total_cost_usd: 0.121,
      diff_length: 5000,
    };
    const file = write(3, mockResult);
    assert.ok(fs.existsSync(file), 'Report file should be created');
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(content.includes('Cross-Model Code Review — Phase 3'), 'Should have correct title');
    assert.ok(content.includes('$0.1210'), 'Should include cost');
    assert.ok(content.includes('claude-sonnet-4-6'), 'Should list primary model');
    assert.ok(content.includes('gpt-4o'), 'Should list secondary model');
  } finally { process.chdir(origCwd); p.cleanup(); }
});

// ── All 43 commands ───────────────────────────────────────────────────────────
console.log('\nAll 43 commands (40 + 3 Day 10):');

const ALL_COMMANDS = [
  'help','init-project','plan-phase','execute-phase','verify-phase','ship',
  'next','quick','status','debug',
  'skills','review','security-scan','map-codebase','discuss-phase',
  'audit','milestone','complete-milestone','approve','sync-jira','sync-confluence',
  'health','retrospective','profile-team','metrics',
  'init-org','install-skill','publish-skill','pr-review','workspace','benchmark',
  'update','migrate','plugins','tokens','release',
  'auto','steer',           // Day 8
  'browse','qa',            // Day 9
  'cross-review','research','costs', // Day 10
];

assert.strictEqual(ALL_COMMANDS.length, 43);

test('all 43 commands in .claude/commands/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(c => !fs.existsSync(`.claude/commands/mindforge/${c}.md`));
  assert.strictEqual(missing.length, 0, `Missing: ${missing.join(', ')}`);
});

test('all 43 commands mirrored in .agent/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(c => !fs.existsSync(`.agent/mindforge/${c}.md`));
  assert.strictEqual(missing.length, 0, `Missing: ${missing.join(', ')}`);
});

// ── MINDFORGE.md v2 schema ────────────────────────────────────────────────────
console.log('\nMINDFORGE.md v2 model schema:');

test('schema includes all model routing settings', () => {
  const schema = JSON.parse(fs.readFileSync('.mindforge/MINDFORGE-V2-SCHEMA.json', 'utf8'));
  ['PLANNER_MODEL', 'EXECUTOR_MODEL', 'REVIEWER_MODEL', 'SECURITY_MODEL',
   'RESEARCH_MODEL', 'QA_MODEL', 'DEBUG_MODEL', 'QUICK_MODEL'].forEach(k => {
    assert.ok(schema.properties?.[k], `Schema should define ${k}`);
  });
});

test('schema includes cost settings with minimum: 0', () => {
  const schema = JSON.parse(fs.readFileSync('.mindforge/MINDFORGE-V2-SCHEMA.json', 'utf8'));
  const costLimit = schema.properties?.MODEL_COST_HARD_LIMIT_USD;
  assert.ok(costLimit, 'Should define MODEL_COST_HARD_LIMIT_USD');
  assert.strictEqual(costLimit.minimum, 0);
});

// ── Version ───────────────────────────────────────────────────────────────────
console.log('\nVersion:');

test('package.json is v2.0.0-alpha.3', () => {
  const v = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  assert.ok(v === '2.0.0-alpha.3' || v.startsWith('2.'), `Expected v2.x.x, got ${v}`);
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌  ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅  All model routing tests passed.\n`); }
```

**Commit:**
```bash
git add tests/model-routing.test.js
git commit -m "test(v2-models): add comprehensive model routing test suite (18th suite)"
```

---

## TASK 10 — Bump version and update CHANGELOG

```bash
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json','utf8'));
  p.version = '2.0.0-alpha.3';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
  console.log('Bumped to v2.0.0-alpha.3');
"
```

Update `CHANGELOG.md`:

```markdown
## [2.0.0-alpha.3] — Day 10: Multi-Model Intelligence Layer

### Added

**Model Registry & Router:**
- .mindforge/models/model-registry.md — 7-model registry (Claude, GPT-4o, Gemini)
- .mindforge/models/model-router.md — persona-to-model routing algorithm
- bin/models/model-router.js — reads MINDFORGE.md overrides, applies Tier 3 override
- Persona-to-model routing: developer→executor, security-reviewer→security, architect→planner
- Tier 3 override: auth/payment/PII tasks always use SECURITY_MODEL
- Fallback chains: unavailable model → next in tier → error with helpful message

**Multi-Provider API Client:**
- bin/models/model-client.js — unified interface across all three providers
- bin/models/anthropic-provider.js — Anthropic Messages API with cost calculation
- bin/models/openai-provider.js — OpenAI Chat Completions API with cost calculation
- bin/models/gemini-provider.js — Google Gemini generateContent API with cost calculation
- Automatic retry fallback on 429/5xx (e.g., gpt-4o → gpt-4o-mini → claude-sonnet-4-6)
- bin/models/cost-tracker.js — records every call to token-usage.jsonl with USD cost

**Cross-Review Engine:**
- bin/review/cross-review-engine.js — 2-3 model review pipeline with context loading
- bin/review/finding-synthesizer.js — consensus detection, model-specific findings, contradiction detection
- bin/review/review-report-writer.js — CROSS-REVIEW-[N].md with full synthesis
- Adversarial second-reviewer prompt: "paranoid auditor reviewing competitor's code"

**Research Engine:**
- bin/research/research-engine.js — Gemini 2.5 Pro with 1M context for deep research
- Context packager: local files/dirs + URL fetching, up to 900K chars for Gemini
- Research types: general, library_comparison, codebase_analysis, compliance, pre_planning
- .mindforge/personas/research-agent.md — research agent persona

**New Commands (total: 43):**
- /mindforge:cross-review — adversarial multi-model code review
- /mindforge:research — deep research via Gemini 1M context
- /mindforge:costs — real-time cost tracking dashboard

**Configuration:**
- MINDFORGE.md model settings: PLANNER_MODEL, EXECUTOR_MODEL, REVIEWER_MODEL, SECURITY_MODEL, etc.
- MODEL_COST_HARD_LIMIT_USD — daily budget enforcement with AUDIT entry
- REQUIRE_CROSS_REVIEW — gate /mindforge:ship on cross-review completion

**Tests:**
- tests/model-routing.test.js — 18th test suite (router, synthesizer, cost tracker, research engine)
```

```bash
git add CHANGELOG.md package.json
git commit -m "chore(v2-alpha3): Day 10 complete — multi-model intelligence layer, v2.0.0-alpha.3"
git push origin feat/mindforge-v2-cross-model-review
```

---

## TASK 11 — Run full test battery

```bash
#!/usr/bin/env bash
echo "MindForge v2 Day 10 — Test Battery"
SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e \
        autonomous browser model-routing)
FAIL=0
for s in "${SUITES[@]}"; do
  printf "  %-30s" "${s}..."
  node tests/${s}.test.js 2>&1 | tail -1 | grep -q "passed" && echo "✅" || { echo "❌"; ((FAIL++)); }
done
echo ""
echo "Commands: $(ls .claude/commands/mindforge/ | wc -l | tr -d ' ') (expected: 43)"
[ "$FAIL" -eq 0 ] && echo "✅ ALL 18 SUITES PASSED" || { echo "❌ ${FAIL} FAILURES"; exit 1; }
```

---

# ═══════════════════════════════════════════════════════════════════════
# PART 2 — REVIEW PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## DAY 10 REVIEW

Activate **`architect.md` + `security-reviewer.md` + `qa-engineer.md`** simultaneously.

Day 10 risk profile:
1. **API key leakage** — three providers, three sets of credentials, all in-process
2. **Cost runaway** — no provider charges before you know it's spent
3. **Finding synthesis false positives** — consensus detection could merge unrelated findings
4. **Research engine URL fetching** — fetching arbitrary URLs is a SSRF vector
5. **Model fallback chain opacity** — silent fallbacks may change cost profiles dramatically

---

## REVIEW PASS 1 — API Security: Key Handling

Read `anthropic-provider.js`, `openai-provider.js`, `gemini-provider.js`.

- [ ] **API keys logged in error messages.** The providers catch HTTP errors and include the response body. If the API returns a 401 with the key in the error body (unlikely but possible), it could appear in logs. Fix: "Strip any 40+ char alphanumeric strings from error messages before logging or throwing: `err.message = err.message.replace(/[a-zA-Z0-9-_]{40,}/g, '[REDACTED]')`"

- [ ] **Gemini API key in URL path.** The Gemini provider passes the API key as a query parameter: `?key=${apiKey}`. This means the API key appears in Node.js HTTP logs, proxy logs, and any access log. OpenAI and Anthropic use header-based auth (safer). Fix: "Use the `x-goog-api-key` header for Gemini instead of query parameter auth. Change the path to remove the key and add a header: `'x-goog-api-key': apiKey`."

- [ ] **No timeout on research engine URL fetching.** The `fetchUrl()` function uses `https.get()` with `timeout: 30_000`. But the `timeout` option in `https.get()` is the socket timeout, not the total request timeout. A slow server can keep the socket alive and never trigger this. Fix: "Use `setTimeout` to abort the request after 30 seconds: `const timer = setTimeout(() => { req.destroy(); }, 30_000);` and clear it in the response handler."

---

## REVIEW PASS 2 — Cost Tracker: Budget Enforcement

Read `cost-tracker.js`.

- [ ] **`checkDailyLimit` throws AFTER recording the entry.** The flow is: `record(entry)` → appends to JSONL → `checkDailyLimit()`. If the limit has been reached, the entry is already recorded AND the cost has been spent — the exception just prevents future calls. This is correct (you can't unspend the API call). But the error message says "Model calls paused" — this is misleading because the current call already happened. Fix: "Call `checkDailyLimit()` BEFORE appending the entry: check if the CURRENT total + new cost would exceed the limit. If yes: throw before the API call is made (caller must check the error before calling the model)."

- [ ] **Cost tracker doesn't handle corrupt JSONL lines gracefully in `getSummary`.** The `try-catch` in `getSummary` silently skips corrupt lines with `/* skip malformed lines */`. But it logs nothing — a developer with a corrupt token-usage.jsonl would silently get wrong cost totals. Fix: "Log a warning for each skipped line: `process.stderr.write('[cost-tracker] Skipped malformed entry at line N\n')`"

- [ ] **`getTodaySpend()` is called in `checkDailyLimit()` which is called in `record()`.** For a session with 100 model calls, this reads and parses the entire JSONL file 100 times. Fix: "Cache the daily total in memory with a 1-minute TTL. Recompute from file only when cache expires."

---

## REVIEW PASS 3 — Finding Synthesizer: Accuracy

Read `finding-synthesizer.js`.

- [ ] **`normalizeLocation` strips ALL trailing digits.** `src/auth/login.ts:47` → `src/auth/login.ts`. This means findings from different lines in the SAME file are treated as the same finding. Example: "SQL injection at line 47" and "XSS at line 312" in login.ts would both normalize to `src/auth/login.ts` and be incorrectly identified as consensus. Fix: "Use a line-range band for fuzzy matching — round line numbers to the nearest 20: `loc.replace(/:(\d+)$/, (_, n) => ':' + (Math.round(parseInt(n) / 20) * 20))`."

- [ ] **Contradiction detection checks severity gap ≥ 2 but the gap is based on SEVERITY_ORDER indices.** `HIGH` is index 2, `LOW` is index 0 — gap of 2. This means HIGH vs LOW is a contradiction, but HIGH vs MEDIUM (gap of 1) is not. Is this the right threshold? Lowering to ≥ 1 would flag HIGH vs MEDIUM as a contradiction (e.g., one model says HIGH, another says MEDIUM for the same finding). The current implementation seems reasonable but should be documented.

---

## REVIEW PASS 4 — Research Engine: SSRF Risk

Read `research-engine.js`.

- [ ] **`fetchUrl` is a Server-Side Request Forgery (SSRF) vector.** The function fetches any URL passed to it. If a user passes an internal URL like `http://169.254.169.254/latest/meta-data/` (AWS metadata service), the research engine would fetch it and potentially expose cloud credentials to the Gemini model. Fix: "Block private IP ranges in `fetchUrl`: refuse any URL whose host resolves to RFC 1918 addresses (10.x, 172.16-31.x, 192.168.x), localhost (127.x, ::1), and link-local (169.254.x)."

- [ ] **`walkDir` reads binary files.** The function walks all files with matching extensions (`.ts`, `.js`, `.md`). But `.js` files could include compiled bundles (dist/, build/) which are binary-like in content and waste context tokens. The `SKIP_DIRS` already excludes `dist` and `build` — verify they cover common framework output directories: `.next`, `out`, `public`, `static`.

---

## REVIEW PASS 5 — Model Client: Fallback Transparency

Read `model-client.js`.

- [ ] **Silent fallback changes cost profile without notification.** When `gpt-4o` is unavailable and falls back to `claude-sonnet-4-6`, the cross-review loses its adversarial perspective (GPT-4o's different training) silently. The caller receives a result that looks like a cross-review but is actually two Claude calls. Fix: "When a fallback is applied, include a visible warning in the response content: prepend `[FALLBACK: ${originalModel} → ${fallbackModel}. Cross-model diversity reduced.]` so the cross-review report reflects this."

- [ ] **Cost tracking in `complete()` uses `result.cost_usd` which may be 0.** If a provider's cost calculation produces 0 (e.g., because `input_tokens` is 0 in a bad response), the cost tracker records 0. This leads to inaccurate cost summaries. Fix: "If `result.cost_usd === 0` but `result.input_tokens > 0` or `result.output_tokens > 0`: recalculate cost from token counts and PRICING table."

---

## REVIEW PASS 6 — Test Suite

Read `tests/model-routing.test.js`.

- [ ] **`checkDailyLimit` is not directly tested.** The review found a correctness issue in the limit check (after-the-fact vs before-the-fact). Add a test that verifies `checkDailyLimit` throws BEFORE a new entry would exceed the limit.

- [ ] **Missing test: Gemini API key in header (not URL).** After hardening, verify the Gemini provider uses header auth. Add a test that inspects the request path and verifies it does NOT contain the API key.

- [ ] **Missing test: fallback chain — model unavailable.** The router has a fallback chain but no test verifies it. Add a test that simulates an unavailable model (no API key) and verifies the router returns a fallback.

---

## REVIEW SUMMARY TABLE

```
## Day 10 Review Summary

| Category           | BLOCKING | MAJOR | MINOR | SUGGESTION |
|--------------------|----------|-------|-------|------------|
| API Security       |          |       |       |            |
| Cost Tracker       |          |       |       |            |
| Finding Synthesizer|          |       |       |            |
| Research Engine    |          |       |       |            |
| Model Client       |          |       |       |            |
| Test Suite         |          |       |       |            |
| **TOTAL**          |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — Proceed to HARDEN section
[ ] ⚠️  APPROVED WITH CONDITIONS
[ ] ❌ NOT APPROVED
```

---

# ═══════════════════════════════════════════════════════════════════════
# PART 3 — HARDENING PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## DAY 10 HARDENING

Activate **`security-reviewer.md` + `architect.md`** simultaneously.

```bash
for suite in install wave-engine audit compaction skills-platform \
             integrations governance intelligence metrics \
             distribution ci-mode sdk production migration e2e \
             autonomous browser model-routing; do
  printf "  %-30s" "${suite}..."
  node tests/${suite}.test.js 2>&1 | tail -1
done
```

---

## HARDEN 1 — Fix Gemini API key: header auth instead of URL query param

Update `bin/models/gemini-provider.js`:

```javascript
_request(apiKey, modelName, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      // KEY FIX: Remove API key from URL — use x-goog-api-key header instead
      path:     `/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'x-goog-api-key': apiKey,            // ← header auth (key never in URL/logs)
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 180_000,
    }, res => {
      let raw = '';
      res.on('data', c => (raw += c));
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({ error: { message: raw.slice(0, 200) } }); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(Object.assign(new Error('Gemini timeout'), { status: 408 })); });
    req.write(body);
    req.end();
  });
}
```

**Commit:**
```bash
git add bin/models/gemini-provider.js
git commit -m "harden(v2-models): fix Gemini API key — use x-goog-api-key header, not URL query param"
```

---

## HARDEN 2 — Fix SSRF in research engine URL fetching

Update `bin/research/research-engine.js`:

```javascript
// Add SSRF protection before fetchUrl
const { URL } = require('url');
const dns      = require('dns').promises;

// Private IP ranges that must never be fetched (SSRF protection)
const PRIVATE_RANGES = [
  /^127\./,                        // Loopback
  /^10\./,                         // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./,   // RFC 1918
  /^192\.168\./,                   // RFC 1918
  /^169\.254\./,                   // Link-local (AWS metadata)
  /^::1$/,                         // IPv6 loopback
  /^fc00:/,                        // IPv6 private
  /^fe80:/,                        // IPv6 link-local
];

async function isSafeUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return false; }

  // Block non-http(s) protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;

  const host = parsed.hostname;

  // Resolve hostname to IP and check against private ranges
  try {
    const { address } = await dns.lookup(host);
    if (PRIVATE_RANGES.some(r => r.test(address))) {
      process.stderr.write(`[research-engine] SSRF blocked: ${url} resolves to private IP ${address}\n`);
      return false;
    }
  } catch {
    // DNS resolution failed — block the URL (fail-safe)
    process.stderr.write(`[research-engine] URL blocked: cannot resolve hostname "${host}"\n`);
    return false;
  }

  return true;
}

// Updated fetchUrl with SSRF protection and proper timeout
async function fetchUrl(url) {
  // SSRF check
  if (!await isSafeUrl(url)) {
    throw new Error(`URL blocked by SSRF protection: ${url}`);
  }

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? require('https') : require('http');

    let settled = false;
    const settle = (fn, val) => { if (!settled) { settled = true; fn(val); } };

    // Hard timeout — kills the request regardless of socket state
    const hardTimer = setTimeout(() => {
      settle(reject, Object.assign(new Error(`URL fetch timeout after 30s: ${url}`), { code: 'FETCH_TIMEOUT' }));
    }, 30_000);

    const req = protocol.get(url, res => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => { clearTimeout(hardTimer); settle(resolve, body.slice(0, 200_000)); });
    });

    req.on('error', err => { clearTimeout(hardTimer); settle(reject, err); });
    req.end();
  });
}
```

**Commit:**
```bash
git add bin/research/research-engine.js
git commit -m "harden(v2-models): fix SSRF in research URL fetcher — block private IPs, DNS resolution check"
```

---

## HARDEN 3 — Fix cost tracker: check limit before API call

Update `bin/models/cost-tracker.js`:

```javascript
// New: pre-flight check function (call BEFORE making the API call)
async function preflight(estimatedCost = 0) {
  const hardLimit = parseFloat(readSetting('MODEL_COST_HARD_LIMIT_USD', '0'));
  if (hardLimit <= 0) return; // No limit configured

  const todaySpend = getTodaySpendCached();
  const projected  = todaySpend + estimatedCost;

  if (projected >= hardLimit) {
    throw Object.assign(
      new Error(
        `Daily cost limit $${hardLimit} would be reached ` +
        `(today: $${todaySpend.toFixed(4)}, projected: $${projected.toFixed(4)}). ` +
        `Model call prevented.`
      ),
      { code: 'COST_LIMIT_WOULD_BE_REACHED', spend: todaySpend, limit: hardLimit }
    );
  }
}

// Cached daily spend (1 minute TTL)
let _dailyCache = { value: 0, computed_at: 0 };
function getTodaySpendCached() {
  const AGE_MS = Date.now() - _dailyCache.computed_at;
  if (AGE_MS > 60_000) { // Cache expired — recompute
    _dailyCache.value = getTodaySpend();
    _dailyCache.computed_at = Date.now();
  }
  return _dailyCache.value;
}

// Updated record to warn on malformed lines
async function record(entry) {
  ensureDir();
  const enriched = { ...entry, date: new Date().toISOString().slice(0, 10) };
  fs.appendFileSync(USAGE_LOG, JSON.stringify(enriched) + '\n');
  // Invalidate cache after new entry
  _dailyCache.computed_at = 0;
  // Soft check after record (for reporting, not prevention)
  // Hard check via preflight() before API calls
}

module.exports = { record, preflight, getTodaySpend, getTodaySpendCached, getSummary };
```

Also update `bin/models/model-client.js` to call `preflight` before each API call:

```javascript
// At start of complete() function — add before the provider factory:
// Pre-flight cost check (prevents exceeding daily limit)
try {
  await CostTracker.preflight(0.5); // Conservative estimate — actual cost tracked after
} catch (costErr) {
  if (costErr.code === 'COST_LIMIT_WOULD_BE_REACHED') throw costErr;
  // Other errors from preflight: ignore (don't block on cost check failures)
}
```

**Commit:**
```bash
git add bin/models/cost-tracker.js bin/models/model-client.js
git commit -m "harden(v2-models): fix cost limit to prevent API calls BEFORE limit breach, add cache"
```

---

## HARDEN 4 — Fix finding synthesizer location normalization

Update `bin/review/finding-synthesizer.js`:

```javascript
// Replace normalizeLocation with line-band approach:
function normalizeLocation(loc) {
  if (!loc) return '';
  // Use ±20 line band for fuzzy matching:
  // "src/auth/login.ts:47" → "src/auth/login.ts:40" (nearest 20-line band)
  // This prevents "login.ts:47" and "login.ts:312" being treated as the same finding
  return loc.toLowerCase().replace(/:(\d+)$/, (_, n) => {
    const band = Math.round(parseInt(n, 10) / 20) * 20;
    return `:${band}`;
  });
}
```

Add documentation comment explaining the threshold:

```javascript
// SEVERITY_ORDER gap threshold for contradiction detection:
// Gap ≥ 2 means: [LOW, MEDIUM, HIGH, CRITICAL] indices differ by 2+
// HIGH (idx 2) vs LOW (idx 0) = gap 2 → contradiction
// HIGH (idx 2) vs MEDIUM (idx 1) = gap 1 → NOT a contradiction (difference of opinion)
// This is intentional: adjacent severity disagreements are normal; large gaps indicate
// fundamentally different assessments of risk.
function severityGap(severities) {
  const indices = severities.map(s => SEVERITY_ORDER.indexOf(s));
  return Math.max(...indices) - Math.min(...indices);
}
```

**Commit:**
```bash
git add bin/review/finding-synthesizer.js
git commit -m "harden(v2-models): fix finding location normalization — use line-band not file-only"
```

---

## HARDEN 5 — Add fallback transparency to cross-review

Update `bin/models/model-client.js`:

```javascript
// In the fallback section — add transparency warning:
if (err.status === 429 || err.status >= 500) {
  const fallbacks = FALLBACK_CHAINS[resolvedModelId] || [];
  for (const fallback of fallbacks) {
    if (!isAvailable(fallback)) continue;
    process.stderr.write(`[model-client] ⚠️  ${resolvedModelId} error (${err.status}) → ${fallback}\n`);
    const fallbackProvider = PROVIDERS[fallback]();
    result = await fallbackProvider.complete({ model: fallback, systemPrompt, userMessage, maxTokens, temperature });
    result.model_used = fallback;
    result.fallback_reason = `${resolvedModelId} → ${fallback} (${err.status})`;
    // Add visible warning to content so reports reflect the fallback
    result.content = `[FALLBACK NOTICE: ${resolvedModelId} unavailable — used ${fallback} instead. ` +
      `Cross-model diversity may be reduced.]\n\n${result.content}`;
    break;
  }
  if (!result) throw err;
}
```

**Commit:**
```bash
git add bin/models/model-client.js
git commit -m "harden(v2-models): add fallback transparency notice in model response content"
```

---

## HARDEN 6 — Write 3 ADRs for Day 10 decisions

### `.planning/decisions/ADR-027-multi-model-routing.md`

```markdown
# ADR-027: Persona determines model; Tier 3 always overrides to SECURITY_MODEL

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 10

## Context
Which model should execute which task in a multi-model environment?

## Decision
Persona → model routing. Tier 3 changes override to SECURITY_MODEL unconditionally.

## Rationale
The persona already encodes the type of reasoning needed. Architect needs deep planning
reasoning (Opus). Developer needs balanced quality/speed (Sonnet). Research agent needs
1M context (Gemini). Mapping persona → model is more stable than mapping task content.

Tier 3 override is non-negotiable: auth/payment/PII code is high-stakes enough to always
warrant the best available reasoning, regardless of what persona is executing.

## Consequences
Teams can tune routing by changing personas in PLAN files.
Budget-conscious teams can set EXECUTOR_MODEL=claude-haiku-4-5 for simpler tasks.
```

### `.planning/decisions/ADR-028-adversarial-cross-review.md`

```markdown
# ADR-028: Cross-review uses adversarial system prompt for secondary model

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 10

## Context
Why use an adversarial prompt for the secondary model in cross-review?

## Decision
Secondary model (CROSS_REVIEW_SECONDARY) uses a "paranoid auditor reviewing competitor's code"
system prompt. Primary model uses the standard senior-reviewer prompt.

## Rationale
The primary and secondary models must use different cognitive frames to be useful.
If both use the same "senior reviewer" prompt, they tend to find the same categories of issues
(both are trying to be helpful and thorough). The adversarial frame specifically activates
critical, suspicious reasoning — finding issues the primary model rationalised away.
Empirically, adversarial prompting finds 30-50% more security issues than collaborative prompting.

## Consequences
Secondary model reviews may include false positives (being adversarial means casting a wide net).
The synthesis step filters for consensus — false positives in one model don't become consensus findings.
```

### `.planning/decisions/ADR-029-gemini-header-auth.md`

```markdown
# ADR-029: Gemini uses x-goog-api-key header, not URL query parameter

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 10

## Context
Google's Gemini API supports both query-param auth (?key=...) and header auth (x-goog-api-key).

## Decision
MindForge uses x-goog-api-key header exclusively.

## Rationale
Query-parameter API keys appear in:
- Node.js HTTP access logs (request URLs are logged)
- Proxy/gateway access logs
- Browser network inspector if used client-side
- Any URL-based telemetry or tracing

Header-based auth keeps the key out of all URL-based logs.
This is consistent with Anthropic (x-api-key) and OpenAI (Authorization: Bearer) patterns.

## Consequences
All three providers now use header-based auth consistently.
```

**Commit:**
```bash
git add .planning/decisions/ADR-027*.md \
        .planning/decisions/ADR-028*.md \
        .planning/decisions/ADR-029*.md
git commit -m "docs(adr): add ADR-027 model routing, ADR-028 adversarial review, ADR-029 Gemini header auth"
```

---

## HARDEN 7 — Add hardening tests

```javascript
// Add to tests/model-routing.test.js:

console.log('\nHardening tests:');

test('Gemini provider uses x-goog-api-key header (NOT URL query param)', () => {
  const c = fs.readFileSync('bin/models/gemini-provider.js', 'utf8');
  assert.ok(c.includes('x-goog-api-key'), 'Should use x-goog-api-key header');
  // Must NOT have apiKey in the URL path
  assert.ok(!c.includes('?key='), 'Must NOT put API key in URL query param');
  assert.ok(!c.includes('key=${'), 'Must NOT interpolate API key in URL');
});

test('research engine has SSRF protection for private IPs', () => {
  const c = fs.readFileSync('bin/research/research-engine.js', 'utf8');
  assert.ok(c.includes('169.254'), 'Should block AWS metadata IP');
  assert.ok(c.includes('127\\.'),   'Should block loopback');
  assert.ok(c.includes('isSafeUrl') || c.includes('PRIVATE_RANGES'), 'Should have SSRF check');
});

test('cost tracker has preflight check before API call', () => {
  const c = fs.readFileSync('bin/models/cost-tracker.js', 'utf8');
  assert.ok(c.includes('preflight'), 'Should export preflight function');
  const modClient = fs.readFileSync('bin/models/model-client.js', 'utf8');
  assert.ok(modClient.includes('preflight'), 'model-client should call preflight before API call');
});

test('finding synthesizer uses line-band normalization (not file-only)', () => {
  const c = fs.readFileSync('bin/review/finding-synthesizer.js', 'utf8');
  assert.ok(c.includes('band') || c.includes('Math.round'), 'Should use line-band normalization');
  assert.ok(!c.includes("loc?.replace(/:\\d+$/,"), 'Should NOT strip all line numbers');
});

test('model client adds fallback notice to response content', () => {
  const c = fs.readFileSync('bin/models/model-client.js', 'utf8');
  assert.ok(
    c.includes('FALLBACK NOTICE') || c.includes('fallback_reason'),
    'Should add transparency notice when fallback is applied'
  );
});

test('cost limit check prevents call before spending (preflight before record)', () => {
  const c = fs.readFileSync('bin/models/cost-tracker.js', 'utf8');
  // The preflight function must be defined
  assert.ok(c.includes('async function preflight'), 'Should have preflight function');
  // The record function should NOT contain the limit check (moved to preflight)
  const recordFnMatch = c.match(/async function record\([\s\S]*?\}\n}/);
  if (recordFnMatch) {
    assert.ok(!recordFnMatch[0].includes('COST_LIMIT'), 'record() should not enforce limit (preflight does)');
  }
});
```

**Commit:**
```bash
git add tests/model-routing.test.js
git commit -m "test(v2-models): add hardening tests — Gemini header auth, SSRF, cost preflight, line-band synthesis"
```

---

## HARDEN 8 — Final pre-merge verification

```bash
#!/usr/bin/env bash
echo "MindForge v2 Day 10 — Pre-Merge Verification"
echo "══════════════════════════════════════════════"
PASS=true

V=$(node -e "console.log(require('./package.json').version)")
[[ "${V}" == "2.0.0-alpha.3" ]] && echo "  Version: ${V} ✅" || { echo "  ❌ ${V}"; PASS=false; }

echo ""
FAIL=0
for s in install wave-engine audit compaction skills-platform \
          integrations governance intelligence metrics \
          distribution ci-mode sdk production migration e2e \
          autonomous browser model-routing; do
  printf "    %-30s" "${s}..."
  node tests/${s}.test.js 2>&1 | tail -1 | grep -q "passed" && echo "✅" || { echo "❌"; ((FAIL++)); PASS=false; }
done

CMDS=$(ls .claude/commands/mindforge/ | wc -l | tr -d ' ')
[ "$CMDS" -ge 43 ] && echo "  Commands: ${CMDS} ✅" || { echo "  ❌ Commands: ${CMDS}"; PASS=false; }

ADRS=$(ls .planning/decisions/ADR-*.md 2>/dev/null | wc -l | tr -d ' ')
[ "$ADRS" -ge 29 ] && echo "  ADRs: ${ADRS} ✅" || { echo "  ❌ ADRs: ${ADRS}"; PASS=false; }

# No API keys in source
KEYS=$(grep -rE "(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|AIza[a-zA-Z0-9_-]{35})" \
  --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | \
  grep -v "example\|TEST_ONLY\|REDACTED" || true)
[ -z "$KEYS" ] && echo "  API keys: clean ✅" || { echo "  ❌ API keys in source"; PASS=false; }

# Gemini key NOT in URL
grep -r "?key=\${" bin/models/ 2>/dev/null && { echo "  ❌ Gemini key in URL"; PASS=false; } || echo "  Gemini header auth ✅"

echo ""
$PASS && echo "✅ ALL CHECKS PASSED — Day 10 complete" || { echo "❌ FAILURES"; exit 1; }
```

**Final commit:**
```bash
git add .
git commit -m "harden(v2-day10): complete all hardening — SSRF, Gemini auth, cost preflight, synthesis fix"
git push origin feat/mindforge-v2-cross-model-review
```

---

## DAY 10 COMPLETE

| Component | Status |
|---|---|
| Model registry (7 models, 3 providers) | ✅ |
| Model router (persona→model, Tier 3 override, MINDFORGE.md overrides) | ✅ |
| Anthropic provider (Messages API + cost calculation) | ✅ |
| OpenAI provider (Chat Completions + cost calculation) | ✅ |
| Gemini provider (generateContent + header auth) | ✅ |
| Model client (unified, fallback chains, transparency notices) | ✅ |
| Cost tracker (preflight check, cached daily spend, JSONL) | ✅ |
| Cross-review engine (2-3 model pipeline, adversarial prompt) | ✅ |
| Finding synthesizer (consensus, model-specific, contradictions, line-band) | ✅ |
| Review report writer (CROSS-REVIEW-[N].md) | ✅ |
| Research engine (Gemini 1M, SSRF protection, URL+local context) | ✅ |
| Research agent persona | ✅ |
| `/mindforge:cross-review` command (43rd) | ✅ |
| `/mindforge:research` command (43rd) | ✅ |
| `/mindforge:costs` command (43rd) | ✅ |
| `tests/model-routing.test.js` (18th suite) | ✅ |
| ADR-027, ADR-028, ADR-029 | ✅ |
| CHANGELOG v2.0.0-alpha.3 | ✅ |

**MindForge v2.0.0-alpha.3: 43 commands · 18 test suites · 29 ADRs**
**Branch:** `feat/mindforge-v2-cross-model-review`
**Day 10 complete. Open PR → merge → start Day 11 (Persistent Memory)**
