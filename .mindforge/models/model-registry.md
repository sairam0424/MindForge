# MindForge v2 — Model Registry
# Version: v2.0.0-alpha.3

MindForge v2 uses a tiered multi-model architecture. Models are selected based on the task persona and difficulty tier.

## 1. Primary Reasoning Tier (Tier 1)
Used for complex architecture, planning, and high-stakes reasoning.

- **Anthropic Claude 3.5 Opus** (`claude-3-opus-20240229`)
  - Strengths: Deepest reasoning, highly reliable for planning.
  - Persona mapping: `architect`, `planner`.
  - Setting: `PLANNER_MODEL`.

- **OpenAI GPT-4o** (`gpt-4o`)
  - Strengths: Fast reasoning, excellent tool use, adversarial insight.
  - Persona mapping: `reviewer`, `security-reviewer`.
  - Setting: `REVIEWER_MODEL`.

## 2. Execution Tier (Tier 2)
Used for the bulk of code implementation and transformation tasks.

- **Anthropic Claude 3.5 Sonnet** (`claude-3-5-sonnet-20240620`)
  - Strengths: Balanced speed/quality, best-in-class coding.
  - Persona mapping: `developer`, `qa-engineer`.
  - Setting: `EXECUTOR_MODEL`.

- **Google Gemini 1.5 Pro** (`gemini-1.5-pro`)
  - Strengths: 1M context window, deep codebase research.
  - Persona mapping: `research-agent`.
  - Setting: `RESEARCH_MODEL`.

## 3. High-Security/Privacy Tier (Tier 3)
Used for tasks involving authentication, PII, or financial operations.

- **Anthropic Claude 3.5 Opus** (`claude-3-opus-20240229`)
  - Setting: `SECURITY_MODEL`.

## 4. Utility/Quick Tier (Tier 4)
Used for low-ambiguity tasks and micro-transformations.

- **Anthropic Claude 3.5 Haiku** (`claude-3-5-haiku-20241022`)
  - Setting: `QUICK_MODEL`.

## 5. Fallback Chain
If a primary model is unavailable (API key missing or 429), follow these defaults:
1. `gpt-4o` → `claude-3-5-sonnet`
2. `claude-3-opus` → `gpt-4o`
3. `gemini-1.5-pro` → `claude-3-5-sonnet` (limited context)
