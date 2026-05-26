---
name: agent-tool-selection
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: agent tool selection, capability matching, tool routing, cost-aware tool choice, tool fallback chain, tool composition strategy, function selection, tool description optimization, tool disambiguation, tool preference, tool capability matrix, tool ranking
compose: tool-design
---

# Skill — Agent Tool Selection (Intelligent Capability Routing)

## When this skill activates
When designing tool selection logic for AI agents, optimizing tool descriptions,
building fallback chains, or analyzing tool usage patterns. Use for any scenario
where an agent must choose between multiple tools to accomplish a task.

Core principle: **Specificity over generality** — when two tools can both handle a
task, prefer the more specific one. It will be faster, cheaper, and more reliable.
A hammer works for screws, but a screwdriver is better.

## Mandatory actions when this skill is active

### Tool Selection Algorithm

1. **Selection pipeline (in order):**
   ```
   Input: task description + available tools

   Step 1 — Capability Match:
   - For each tool: does its capability set cover the task requirements?
   - Eliminate tools that CANNOT handle the task (hard filter)

   Step 2 — Rank by Specificity:
   - More specific tool > more general tool
   - Example: "Read file" > "Bash (cat)" for reading files
   - Specificity = how narrow is the tool's intended use case?

   Step 3 — Rank by Cost-Efficiency:
   - Among equally capable tools: prefer cheaper/faster
   - Read (free, instant) > Bash cat (process spawn) > API call (network)

   Step 4 — Rank by Reliability:
   - Among equal cost: prefer higher success rate
   - Check historical success rate per tool per task type

   Step 5 — Verify Preconditions:
   - Does the selected tool's preconditions hold?
   - Example: Edit requires file was previously Read
   - If preconditions not met: add prerequisite steps

   Output: ordered list of tools to try (primary + fallbacks)
   ```

2. **Decision matrix template:**
   ```
   | Task Type          | Primary Tool | Fallback 1   | Fallback 2  | Anti-pattern     |
   |--------------------|--------------|--------------|-----------  |------------------|
   | Read file content  | Read         | Bash (cat)   | —           | Grep (wrong use) |
   | Search for pattern | Grep         | Bash (grep)  | Read + scan | Read all files   |
   | Edit existing file | Edit         | Write        | —           | Bash (sed)       |
   | Create new file    | Write        | Bash (echo>) | —           | Edit (no file)   |
   | Run tests          | Bash         | —            | —           | Read test output |
   | Check file exists  | Bash (ls)    | Read (error) | —           | Grep for path    |
   ```

### Tool Description Optimization

3. **Writing effective tool descriptions (they ARE prompts):**
   ```
   Good description (specific, with examples):
   "Read a file from disk. Use when you need to see file contents.
    Supports text, images, PDFs. Prefer over Bash cat/head/tail.
    NOT for directories (use Bash ls)."

   Bad description (vague):
   "Reads things from the filesystem."

   Good description (with when-to-use and when-NOT-to-use):
   "Edit an existing file by replacing exact string matches.
    Use when: modifying 1-5 specific locations in a file.
    Do NOT use when: rewriting >50% of the file (use Write instead).
    Requires: file must have been Read in this session first."

   Bad description (missing boundaries):
   "Edits files."
   ```

   Rules:
   - Include WHEN to use (positive examples)
   - Include when NOT to use (negative examples — prevents misuse)
   - State preconditions explicitly
   - Keep descriptions under 100 words (concise > comprehensive)
   - Use concrete examples, not abstract capabilities

### Cost-Aware Selection

4. **Cost hierarchy (prefer cheaper when quality is equal):**
   ```
   Tier 1 — Free/Instant (prefer these):
   - Read (file content)
   - Edit (modify file)
   - Write (create file)
   - Grep (pattern search in known scope)

   Tier 2 — Cheap/Fast (use when Tier 1 can't):
   - Bash (shell commands — process spawn overhead)
   - Glob (file path patterns)

   Tier 3 — Moderate (use when necessary):
   - LSP (language server queries)
   - Web fetch (network requests)

   Tier 4 — Expensive (use sparingly):
   - Sub-agent spawn (full agent instantiation)
   - Multi-file analysis (token-heavy)
   - External API calls (rate-limited, costly)
   ```

   Rules:
   - Always check if a Tier 1 tool can handle the task before reaching for Tier 3-4
   - Track cumulative cost during a session (don't let tool costs compound silently)
   - For repeated operations: batch when possible (one Bash with && vs many Bash calls)
   - Cost includes: token consumption, time, API calls, compute resources

### Fallback Chains

5. **Designing robust fallback sequences:**
   ```
   Fallback chain structure:
   1. Try primary tool (most specific, cheapest)
   2. If fails (error, timeout, precondition unmet):
      - Log failure reason
      - Try fallback 1 (broader capability)
   3. If fallback 1 fails:
      - Try fallback 2 (most general/expensive)
   4. If all fail:
      - Escalate to user with: what was tried, why each failed, what's needed

   Example:
   Task: "Find where function X is defined"
   1. Grep (fast, pattern-based) → found? done
   2. LSP (semantic, language-aware) → found? done
   3. Bash find + grep (brute force) → found? done
   4. Escalate: "I couldn't locate function X. Can you point me to the file?"
   ```

   Rules:
   - Fallback chains should be pre-defined per task type (not improvised)
   - Each fallback should be DIFFERENT in approach (not just retry)
   - Log which level of the chain succeeded (optimize primary over time)
   - Max 3 fallback levels before escalation (avoid infinite retry loops)

### Tool Composition

6. **Combining tools for complex tasks:**
   ```
   Composition patterns:

   Sequential: Tool A output → Tool B input
   Example: Grep (find file) → Read (get content) → Edit (modify)

   Parallel: Tool A + Tool B independently → merge results
   Example: Grep (find usages) + Read (get definition) → understand full context

   Conditional: If Tool A succeeds → Tool B, else → Tool C
   Example: If Read(file) succeeds → Edit, else → Write (file doesn't exist)

   Iterative: Repeat Tool A until condition met
   Example: Bash(test) → fails → Edit(fix) → Bash(test) → passes → done
   ```

   Rules:
   - Plan composition BEFORE executing (don't improvise mid-chain)
   - Minimize total tool calls (combine steps where possible)
   - Never call the same tool twice with identical inputs (cache/reuse results)
   - If composition exceeds 5 sequential steps: consider if there's a more direct tool

### Tool Disambiguation

7. **When multiple tools seem equally valid:**
   ```
   Disambiguation criteria (in priority order):
   1. Fewer side effects: Read-only > Read-write (prefer observation over action)
   2. More specific: Narrow tool > broad tool (Edit > Bash sed)
   3. Cheaper: Less resource consumption > more
   4. More reversible: Undoable > permanent (Edit > Write for existing files)
   5. Better error messages: Tools with clear failure modes > opaque failures

   If still tied after all criteria: pick the one that appears first in the
   tool list (convention-based tie-breaking, prevents analysis paralysis)
   ```

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I follow the selection pipeline (capability → specificity → cost → reliability)?
- [ ] Are tool descriptions specific, with positive AND negative usage examples?
- [ ] Is cost hierarchy respected (cheaper tools preferred when quality is equal)?
- [ ] Are fallback chains defined for each critical task type (max 3 levels)?
- [ ] Is tool composition planned before execution (not improvised)?
- [ ] Are disambiguations resolved by: side effects → specificity → cost → reversibility?
- [ ] Are tool calls minimized (no redundant calls, batched where possible)?
- [ ] Is escalation to user defined as the final fallback (not infinite retry)?
