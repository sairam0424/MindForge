# MindForge v13 Upgrade Research Adoption — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the highest-confidence, best-grounded upgrades identified by the post-v12.0.0 10-pass deep-research round (MCP capabilities, subagent/skill frontmatter hardening, hook coverage), each independently shippable and tested.

**Architecture:** No rewrites. Every task adds a bounded capability to an existing, working subsystem (MCP server, `.agent/settings.json` → plugin `hooks.json` pipeline, subagent/skill frontmatter) using patterns the codebase already establishes elsewhere (the `registerTool` wrapper, the `EVENT_MAP` translation, the `withFileLock` pattern). Phase 6 is a discovery spike, not an implementation — two research findings (Tool Search Tool `defer_loading`, static/embedding-free embedding models) need feasibility verification before any code task can be written for them honestly.

**Tech Stack:** TypeScript (`mcp-server/`, `@modelcontextprotocol/sdk@^1.29.0`, `zod`), Node.js CommonJS (`bin/`), YAML frontmatter (skills/subagents), JSON (`.agent/settings.json`, `hooks.json`).

**Spec:** This plan's spec is the consolidated research synthesis delivered earlier in this session (10-pass deep-research, cross-referenced against `docs/research/2026-08-v12-upgrade-report.md`), narrowed to items independently re-verified against the current v12.0.0 codebase during this planning pass. Two internal-report items the spec originally listed as "confirmed still-open" — **MCP-01** (MCP version-sourcing) and **LOCK-01** (audit-chain file locking) — are excluded below because direct inspection during planning found both already shipped (`mcp-server/src/index.ts:37` derives `serverInfo.version` from `package.json`; `bin/autonomous/audit-writer.js:107` and `bin/memory/knowledge-graph.js:73` both call `withFileLock`, with the code comments explicitly labeled `LOCK-01`). Executors should not re-open either.

## Global Constraints

- Zero native dependencies — no task may add a package with a compiled/native binary (rules out `sqlite-vec` per the internal report's own do-not-do list; not touched by this plan anyway).
- `mcp-server/` is strict TypeScript, zero-warning ESLint in CI (`eslint src/ --max-warnings 0`).
- `bin/` and `.agent/hooks/` stay CommonJS (`require`), per `docs/research/2026-08-v12-upgrade-report.md` §9 ("Convert `bin/` to ESM" is on the explicit do-not-do list) — new hook scripts must use `require`/`module.exports`, not `import`/`export`.
- `.agent/settings.json` is the single source of truth for hooks; `plugins/mindforge/hooks/hooks.json` is *generated* by `scripts/build-mindforge-plugin.js` and must never be hand-edited (a repo test enforces this — see Task 5).
- Registering a new hook event in `.agent/settings.json` without a matching `EVENT_MAP` entry in `scripts/build-mindforge-plugin.js` silently drops that hook from the shipped plugin (`tests/plugin-packaging.test.js` catches this by tuple-comparison, not by mere presence).
- Engine-tier skill triggers (≥10 comma-separated terms, unique across all engine skills) are asserted by `tests/skills-platform.test.js` — any skill frontmatter edit must keep passing that file's assertions.
- Don't adopt MCP Sampling or Roots capabilities (both deprecated per MCP spec 2026-07-28 SEP-2577) — not part of this plan, called out here only as a standing guardrail for any executor tempted to "complete" the MCP additions by adding them too.

## Review Focus

- **A skill gains `disable-model-invocation: true` but its `triggers:` field is untouched** — `tests/skills-platform.test.js` doesn't check for this combination, so a skill could end up unreachable by both auto-trigger and (if the frontmatter is malformed) manual invocation. Task 8's test must assert the skill is still manually invocable.
- **A subagent gains `disallowedTools` that accidentally denies a tool the subagent's own body instructs it to use** — the agent would silently fail every run. Task 6/7's test must assert the pilot subagents' documented workflow doesn't call a denied tool.
- **The new `EVENT_MAP` entries fire under Gemini too, where `PreCompact`/`SubagentStart`/`SubagentStop` have no real equivalent** — `.agent/hooks/mindforge-context-monitor.js` already switches behavior on `GEMINI_API_KEY`; a new hook script must degrade gracefully (no-op, not throw) when invoked in a context where the underlying Claude-Code-only event data it expects isn't present.
- **`registerPrompt`/`elicitInput` calls added to `mcp-server/src/index.ts` bump the tool/prompt count asserted by `mcp-server/smoke.mjs`** (`process.exit(names.length === 7 ? 0 : 1)`) — a new *prompt* doesn't change the *tool* count, but the smoke test's hardcoded `7` must be re-verified, not assumed stable, after any registration change in this file.
- **Two locked pilot subagents both being spawned in the same wave** — `isolation: worktree` creates a real git worktree per spawn; if the pilot set includes two subagents likely to run concurrently in one `/mindforge:auto` wave, the test must assert their worktrees don't collide (they're per-spawn, so this should hold, but it's exactly the kind of assumption research flagged as a risk in the orchestration findings — worth one explicit test, not just an assumption).

---

## Phase 1 — MCP Server: Prompts capability

**Rationale:** New research confirms the current SDK (`^1.29.0`) already supports `registerPrompt()` (non-deprecated, verified against the vendored `.d.ts`); MindForge's MCP server registers zero prompts today. This is the smallest, most self-contained of the new-capability additions.

### Task 1: Register a `project-health-briefing` MCP prompt

**Files:**
- Modify: `mcp-server/src/index.ts` (add after the last `registerTool(...)` call, before `const transport = ...` if present, or before the connect call at end of file)
- Test: `mcp-server/smoke.mjs` (extend the existing smoke test rather than add a new file — this file already spawns the real bundled server over stdio, which is the only way to exercise MCP registration end-to-end)

**Interfaces:**
- Consumes: `server` (the `McpServer` instance already constructed at `mcp-server/src/index.ts:75-78`), `client()` factory (returns `MindForgeClient`, `mcp-server/src/index.ts:36`), `MindForgeClient.health(): Promise<HealthReport>` (`mcp-server/src/vendor/client.ts:56`).
- Produces: an MCP prompt named `project-health-briefing`, discoverable via `prompts/list`, invocable via `prompts/get` with no required arguments, returning a single user-role message summarizing the project's `HealthReport`.

- [ ] **Step 1: Write the failing smoke assertion**

Edit `mcp-server/smoke.mjs` to also request `prompts/list` and assert the new prompt is present:

```js
req({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
req({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
req({ jsonrpc: '2.0', id: 3, method: 'prompts/list', params: {} });
```

```js
setTimeout(() => {
  srv.kill();
  const lines = out.trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const toolsList = lines.find((l) => l.id === 2);
  const promptsList = lines.find((l) => l.id === 3);
  const toolNames = toolsList?.result?.tools?.map((t) => t.name) ?? [];
  const promptNames = promptsList?.result?.prompts?.map((p) => p.name) ?? [];
  console.log(`OK tools(${toolNames.length}): ${toolNames.join(', ')}`);
  console.log(`OK prompts(${promptNames.length}): ${promptNames.join(', ')}`);
  const toolsOk = toolNames.length === 7;
  const promptsOk = promptNames.includes('project-health-briefing');
  process.exit(toolsOk && promptsOk ? 0 : 1);
}, 500);
```

(Keep the file's existing timeout/kill structure — only the assertion body changes. Re-verify the `=== 7` literal against a live `tools/list` run before trusting it; this plan does not change tool count, only asserts the existing one still holds alongside the new prompt.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npm --prefix mcp-server run build && node mcp-server/smoke.mjs mcp-server/dist/index.js "$(pwd)"`
Expected: `OK prompts(0):` printed, then non-zero exit (prompt not registered yet).

- [ ] **Step 3: Implement the prompt registration**

Add to `mcp-server/src/index.ts`, after the last existing `registerTool(...)` block and before the server connects to its transport:

```ts
// ── Prompts ──────────────────────────────────────────────────────────────────
// MCP Prompts (registerPrompt) are a distinct capability from Tools — a prompt
// returns message templates for the *client* to send to its own model, not a
// tool-call result. This is the server's first prompt; see docs/research/
// mcp-spec-gaps.md for why Elicitation is the other adopted capability (Task 2)
// and why Sampling/Roots are NOT adopted (deprecated, MCP spec 2026-07-28 SEP-2577).
server.registerPrompt(
  "project-health-briefing",
  {
    title: "MindForge project health briefing",
    description:
      "Produces a one-message briefing summarizing this project's MindForge health " +
      "report (audit chain status, config validity, install integrity) for the " +
      "calling model to read before starting work.",
  },
  async () => {
    const report = await safe("health_briefing", async () => client().health());
    const text = report.isError
      ? `MindForge health check failed: ${report.content[0]?.text ?? "unknown error"}`
      : `Project health report:\n\n${report.content[0]?.text ?? "(empty)"}`;
    return {
      messages: [
        {
          role: "user",
          content: { type: "text", text },
        },
      ],
    };
  },
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix mcp-server run build && node mcp-server/smoke.mjs mcp-server/dist/index.js "$(pwd)"`
Expected: `OK tools(7): ...` and `OK prompts(1): project-health-briefing`, exit 0.

Run: `cd mcp-server && npm run typecheck` — Expected: no errors (strict TS, zero-warning ESLint applies to `src/`, not to the smoke script).

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/index.ts mcp-server/smoke.mjs
git commit -m "feat(mcp-server): add project-health-briefing MCP prompt"
```

---

## Phase 2 — MCP Server: Elicitation on the guarded write tool

**Rationale:** The one guarded-write tool (`mindforge_memory_remember`) currently writes unconditionally when called. Elicitation (form mode, added to the spec 2025-06-18, still live/non-deprecated in 2026-07-28) lets the server ask the *user* — not just trust the calling model — before a write, matching the "best practices for MCP servers exposing write tools safely" finding from the security research pass.

### Task 2: Add a confirmation elicitation before `mindforge_memory_remember` writes

**Files:**
- Modify: `mcp-server/src/index.ts` — find the existing `registerTool("mindforge_memory_remember", ...)` block (search for the string `mindforge_memory_remember`) and modify its handler.
- Test: `mcp-server/smoke.mjs` — this tool's actual write behavior needs a targeted assertion; add it as a fourth request in the same smoke run.

**Interfaces:**
- Consumes: `server.server.elicitInput` (the underlying MCP server's elicitation request method — confirm the exact call shape against `mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts` before writing the call; the McpServer wrapper class does not re-expose it under a friendlier name in SDK 1.29.0, so this goes through the low-level `server.server` handle).
- Produces: the existing `mindforge_memory_remember` tool now requires user confirmation via an elicitation round-trip before calling `memory().remember(...)`; behavior is unchanged for MCP clients that don't support elicitation (the SDK auto-rejects/no-ops gracefully per spec — verify this against the live client capability-negotiation, don't assume).

- [ ] **Step 1: Write the failing test**

Add to `mcp-server/smoke.mjs`, after the existing prompts/list request from Task 1:

```js
req({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'mindforge_memory_remember', arguments: { content: 'smoke-test-entry', type: 'note' } } });
```

```js
  const rememberCall = lines.find((l) => l.id === 4);
  // Without elicitation support advertised by this bare test client, the server
  // must decline gracefully (isError, not a crash, not a silent unconfirmed write).
  const rememberDeclinedSafely = rememberCall?.result?.isError === true;
  console.log(`OK remember-without-elicitation-declines-safely: ${rememberDeclinedSafely}`);
  process.exit(toolsOk && promptsOk && rememberDeclinedSafely ? 0 : 1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix mcp-server run build && node mcp-server/smoke.mjs mcp-server/dist/index.js "$(pwd)"`
Expected: FAIL — current behavior writes unconditionally, so `isError` is `false`/absent, `rememberDeclinedSafely` is `false`.

- [ ] **Step 3: Implement elicitation-gated write**

Locate the existing handler body for `mindforge_memory_remember` (search `mcp-server/src/index.ts` for that literal string) and wrap the existing write call:

```ts
async (args) =>
  safe("memory_remember", async () => {
    const confirmation = await server.server.elicitInput({
      message: `Confirm: store this as a new "${args.type}" knowledge entry? Content: ${String(args.content).slice(0, 200)}`,
      requestedSchema: {
        type: "object",
        properties: {
          confirm: { type: "boolean", description: "True to store, false to cancel" },
        },
        required: ["confirm"],
      },
    });
    if (confirmation.action !== "accept" || confirmation.content?.confirm !== true) {
      throw new Error(
        "Write declined — client did not confirm (no elicitation support, or user declined).",
      );
    }
    const m = memory();
    return m.remember(args);
  }),
```

(The existing body inside `memory().remember(args)` is whatever the current handler already does — do not change its signature, only wrap the entry point. `safe()` already turns any thrown error, including the new decline path, into `{ isError: true, ... }` per its existing implementation at `mcp-server/src/index.ts:44-64` — this is why the test in Step 1 asserts `isError === true` rather than a specific message.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix mcp-server run build && node mcp-server/smoke.mjs mcp-server/dist/index.js "$(pwd)"`
Expected: all four `OK` lines print, exit 0.

- [ ] **Step 5: Commit**

```bash
git add mcp-server/src/index.ts mcp-server/smoke.mjs
git commit -m "feat(mcp-server): require elicitation confirmation before memory_remember writes"
```

---

## Phase 3 — Subagent frontmatter hardening (pilot)

**Rationale:** Confirmed via `grep -rn "disallowedTools\|isolation:\|permissionMode" subagents/**/*.md` (zero hits across all 174 category subagents) and independently reinforced by the Agent SDK research (subagent permission-mode inheritance is a structural safety boundary Claude Code enforces natively — a subagent can only be granted a *more* restrictive mode than its parent, never auto-inherits `bypassPermissions`). Piloting on a small, well-understood subset first, not all 174 at once, per this plan's own Review Focus item about denying a tool a subagent's body actually needs.

### Task 3: Add `disallowedTools` + `isolation: worktree` to the wave-executor's spawned subagents

**Files:**
- Modify: the subagent definitions actually spawned by `/mindforge:auto`'s wave executor — first locate them:

```bash
grep -rln "wave-executor\|/mindforge:auto" bin/autonomous/wave-executor.js
grep -n "subagent_type\|spawnAgent\|categories/" bin/autonomous/wave-executor.js | head -20
```

Run this discovery command as the actual first step of this task (its output determines which 2-3 files under `subagents/categories/` get modified — do not guess the filenames without running it, since the pilot set must be the subagents genuinely in the hot path, not an arbitrary sample).

- Test: new file `tests/subagent-frontmatter-hardening.test.js`

**Interfaces:**
- Consumes: the YAML frontmatter shape already established at `subagents/categories/09-meta-orchestration/agent-installer.md:1-6` (`name`, `description`, `tools`, `model` — confirmed via direct read during planning).
- Produces: the pilot subagents gain `disallowedTools: [...]` (explicit denylist, resolved after the existing `tools:` allowlist per the Agent SDK research) and `isolation: worktree` in frontmatter; no other subagent is touched in this task.

- [ ] **Step 1: Run the discovery command above and record the pilot file list**

Paste the actual output into this task's commit message body (not into this plan file) so the eventual PR shows which files were chosen and why.

- [ ] **Step 2: Write the failing test**

This repo has no Jest/Mocha and mixes `node:test` with bare bespoke scripts (`tests/skills-platform.test.js` is the latter — a local `test(name, fn)` helper with try/catch and manual pass/fail counters, run directly via `node tests/<file>.test.js`, discovered by `tests/run-all.js`). Match that dominant bare-script convention rather than introducing `node:test` for this one new file:

```js
// tests/subagent-frontmatter-hardening.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// Populated from Task 3 Step 1's discovery output — replace with the real paths found.
const PILOT_SUBAGENTS = [
  // 'subagents/categories/<real-category>/<real-name>.md',
];

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith('---')) throw new Error(`${filePath}: missing frontmatter (must start with ---)`);
  const end = content.indexOf('---', 3);
  if (end === -1) throw new Error(`${filePath}: unclosed frontmatter`);
  const fm = content.slice(3, end).trim();
  const result = {};
  fm.split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    result[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  });
  return result;
}

console.log('\nSubagent frontmatter hardening — pilot set\n');

test('PILOT_SUBAGENTS is populated from discovery', () => {
  assert.ok(PILOT_SUBAGENTS.length > 0, 'PILOT_SUBAGENTS is empty — fill in from Task 3 Step 1');
});

PILOT_SUBAGENTS.forEach(rel => {
  test(`${rel}: declares disallowedTools and isolation:worktree`, () => {
    const fm = parseFrontmatter(path.join(__dirname, '..', rel));
    assert.ok(fm.disallowedTools, `${rel}: missing disallowedTools`);
    assert.strictEqual(fm.isolation, 'worktree', `${rel}: isolation must be worktree`);
  });

  test(`${rel}: does not deny a tool its own tools: allowlist grants`, () => {
    const fm = parseFrontmatter(path.join(__dirname, '..', rel));
    const allowed = new Set((fm.tools || '').split(',').map(s => s.trim()).filter(Boolean));
    const denied = new Set((fm.disallowedTools || '').replace(/[[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean));
    denied.forEach(d => assert.ok(!allowed.has(d), `${rel}: disallowedTools denies "${d}" which tools: also allows — contradictory`));
  });
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node tests/subagent-frontmatter-hardening.test.js`
Expected: FAIL on the first assertion (`PILOT_SUBAGENTS is empty`) until Step 1's output is filled in, then FAIL on `missing disallowedTools` once the list is populated but frontmatter isn't yet edited.

- [ ] **Step 4: Edit the pilot subagents' frontmatter**

For each file in `PILOT_SUBAGENTS`, add two lines to the existing frontmatter block (between the existing `tools:` line and the closing `---`), with a per-subagent `disallowedTools` list derived from what that specific subagent's body *doesn't* need (read each file's body before choosing — do not copy the same list across all pilot files):

```yaml
disallowedTools: [Bash(rm -rf *), Bash(git push --force*)]
isolation: worktree
```

(The bracketed example above is illustrative of the syntax only — the actual denylist per subagent must be derived from that subagent's actual documented purpose, read from its own body, not copy-pasted.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `node tests/subagent-frontmatter-hardening.test.js`
Expected: both tests pass.

Run: `npm test` (full suite) to confirm no existing test (e.g. `tests/subagent-import.test.js`) breaks on the frontmatter change.

- [ ] **Step 6: Commit**

```bash
git add subagents/categories/ tests/subagent-frontmatter-hardening.test.js
git commit -m "feat(subagents): pilot disallowedTools + isolation:worktree on wave-executor subagents"
```

---

## Phase 4 — Skill frontmatter hardening: `disable-model-invocation`

**Rationale:** Confirmed via `grep -rl "disable-model-invocation" .mindforge/skills .agent/skills` (zero hits). The internal report's own SKILL-04 already recommended this for "side-effecting skills"; this task scopes it to a concrete, identifiable subset rather than a blanket sweep.

### Task 4: Add `disable-model-invocation: true` to skills that mutate state

**Files:**
- Discover the actual target set first — a skill "mutates state" if its body instructs Write/Edit/Bash side effects rather than pure guidance:

```bash
grep -rl "^## Mandatory actions" .mindforge/skills/*/SKILL.md | xargs grep -l "Write(\|Bash(\|git commit\|git push" | head -20
```

- Modify: whichever `.mindforge/skills/<name>/SKILL.md` files that discovery command surfaces (do not modify `.agent/skills/` — those use the lenient schema and don't have a `disable-model-invocation` consumer to test against in this task's scope).
- Test: `tests/skills-platform.test.js` — this file already parses every skill's frontmatter (`tests/skills-platform.test.js:100`); extend it rather than duplicate its parser.

**Interfaces:**
- Consumes: `parseSkillFrontmatter(filePath)` and `getAllSkillPaths()`, both defined at `tests/skills-platform.test.js:26-58` (confirmed by direct read during planning — `parseSkillFrontmatter` returns a plain object keyed by the literal frontmatter key strings, e.g. `fm['disable-model-invocation']`, since keys can contain hyphens; `getAllSkillPaths()` hardcodes `.mindforge/skills` and returns existing `SKILL.md` paths).
- Produces: the discovered side-effecting skills gain `disable-model-invocation: true`; `triggers:` field is left untouched (per this plan's Review Focus — the skill must remain independently invocable, just not auto-triggered).

- [ ] **Step 1: Run the discovery command above and record the target list**

- [ ] **Step 2: Write the failing test**

Add to `tests/skills-platform.test.js`, after the existing `skillPaths.forEach(...)` per-skill loop (search for that literal to find the insertion point — do not create a second frontmatter parser, reuse `parseSkillFrontmatter`):

```js
// Populated from Task 4 Step 1's discovery output.
const SIDE_EFFECTING_SKILLS = [
  // 'skill-name-here',
];

console.log('\nSide-effecting skill invocation hardening:');

SIDE_EFFECTING_SKILLS.forEach(skillName => {
  test(`${skillName}: side-effecting skill disables auto-invocation`, () => {
    const skillPath = `.mindforge/skills/${skillName}/SKILL.md`;
    assert.ok(fs.existsSync(skillPath), `Missing: ${skillPath}`);
    const fm = parseSkillFrontmatter(skillPath);
    assert.strictEqual(fm['disable-model-invocation'], 'true', `${skillName}: missing disable-model-invocation: true`);
    assert.ok(fm.triggers, `${skillName}: triggers must remain present for manual /name invocation`);
  });
});
```

(This reuses the file's own `test()`/`parseSkillFrontmatter`/`fs`/`assert` — all already in scope at module level in this file, per the read-through done during planning. No new imports needed.)

- [ ] **Step 3: Run test to verify it fails**

Run: `node tests/skills-platform.test.js`
Expected: FAIL — `disable-model-invocation` field absent on every target skill.

- [ ] **Step 4: Edit each target skill's frontmatter**

For each `.mindforge/skills/<name>/SKILL.md` in the discovered set, add one line inside the existing frontmatter block:

```yaml
disable-model-invocation: true
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node tests/skills-platform.test.js`
Expected: pass, including all pre-existing assertions in this file (trigger count ≥10, no duplicate triggers, etc. — this task must not regress those).

- [ ] **Step 6: Commit**

```bash
git add .mindforge/skills/ tests/skills-platform.test.js
git commit -m "feat(skills): disable auto-invocation on side-effecting skills"
```

---

## Phase 5 — Hook coverage: `PreCompact`, `SubagentStart`, `SubagentStop`

**Rationale:** `.agent/settings.json` registers only `SessionStart`/`BeforeTool`/`AfterTool` (confirmed via direct grep). `scripts/build-mindforge-plugin.js:136` translates exactly those three via a fixed `EVENT_MAP`; adding a Claude-only event requires extending that map, not just adding JSON to one file — verified by reading the build script directly during planning.

### Task 5: Wire `PreCompact` + `SubagentStart`/`SubagentStop` through the full pipeline

**Files:**
- Create: `.agent/hooks/mindforge-lifecycle-audit-hook.js` (new, minimal — logs the event to the audit chain via the existing `appendAuditEntrySync`, degrades to a no-op under Gemini)
- Modify: `.agent/settings.json` (add three new top-level hook entries)
- Modify: `.claude/settings.json` (mirror the same three entries in Claude-native form, per this repo's own stated sync requirement)
- Modify: `scripts/build-mindforge-plugin.js:136` (extend `EVENT_MAP`)
- Test: `tests/plugin-packaging.test.js` (this file already asserts `.agent/settings.json` and the built `hooks.json` match as full tuples — no new test file needed, the existing one is the correct enforcement point; add one narrow assertion that the three new events specifically are present)

**Interfaces:**
- Consumes: `appendAuditEntrySync(auditPath, event)` from `bin/autonomous/audit-writer.js:140` (exact signature confirmed during planning — takes a resolved path and an event object, returns the chained entry).
- Produces: three new hook registrations that, on firing, append an audit entry recording which lifecycle event fired and when; the hook script itself takes no action beyond that (scope this task to *visibility*, not new enforcement behavior — enforcement is a separate, larger task the internal report already tracks under HOOK-02/VERIFY-01).

- [ ] **Step 1: Write the new hook script**

```js
// .agent/hooks/mindforge-lifecycle-audit-hook.js
// Records PreCompact / SubagentStart / SubagentStop firings to the audit chain.
// Must never throw: a hook script crash blocks the lifecycle event it's attached to.
'use strict';

const path = require('node:path');
const { appendAuditEntrySync } = require('../../bin/autonomous/audit-writer');

function main() {
  let payload = {};
  try {
    const raw = require('node:fs').readFileSync(0, 'utf8');
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    // No stdin, or not JSON — proceed with an empty payload rather than failing closed.
    // (Gemini-CLI invocations of this file, if any, will hit this path; that's fine —
    // this hook is audit-only, never a gate, so a no-op degrade is correct here.)
  }

  const auditPath = path.resolve(process.cwd(), '.planning', 'AUDIT.jsonl');
  const eventName = payload.hook_event_name || process.env.MINDFORGE_HOOK_EVENT || 'unknown-lifecycle-event';

  try {
    appendAuditEntrySync(auditPath, {
      type: 'lifecycle',
      event: eventName,
      subagent_type: payload.subagent_type || null,
    });
  } catch {
    // Audit append failure must not block the lifecycle event — log to stderr only.
    process.stderr.write(`mindforge-lifecycle-audit-hook: failed to append audit entry for ${eventName}\n`);
  }

  process.exit(0);
}

main();
```

- [ ] **Step 2: Run it standalone to verify it doesn't throw**

Run: `echo '{"hook_event_name":"PreCompact"}' | node .agent/hooks/mindforge-lifecycle-audit-hook.js; echo "exit=$?"`
Expected: `exit=0`, and a new line appended to `.planning/AUDIT.jsonl` with `"event":"PreCompact"`.

- [ ] **Step 3: Extend the build script's EVENT_MAP**

Modify `scripts/build-mindforge-plugin.js:136`:

```js
const EVENT_MAP = {
  SessionStart: 'SessionStart',
  BeforeTool: 'PreToolUse',
  AfterTool: 'PostToolUse',
  PreCompact: 'PreCompact',
  SubagentStart: 'SubagentStart',
  SubagentStop: 'SubagentStop',
};
```

(The three new entries self-map since these events have no Gemini-CLI vocabulary equivalent — `.agent/settings.json` registers them under their real Claude names directly, and the map simply passes them through unchanged. This is a deliberate deviation from the Before/After-Tool translation pattern, not an oversight — leave a one-line comment saying so, since the next person to read this map will otherwise wonder why three entries are identity mappings.)

- [ ] **Step 4: Add the hook registrations to `.agent/settings.json`**

Add three new top-level keys, following the existing structure (each is `{ "hooks": [{ "type": "command", "command": "node .agent/hooks/mindforge-lifecycle-audit-hook.js", "timeout": 5000 }] }`):

```json
"PreCompact": [
  { "hooks": [{ "type": "command", "command": "node .agent/hooks/mindforge-lifecycle-audit-hook.js", "timeout": 5000 }] }
],
"SubagentStart": [
  { "hooks": [{ "type": "command", "command": "node .agent/hooks/mindforge-lifecycle-audit-hook.js", "timeout": 5000 }] }
],
"SubagentStop": [
  { "hooks": [{ "type": "command", "command": "node .agent/hooks/mindforge-lifecycle-audit-hook.js", "timeout": 5000 }] }
]
```

- [ ] **Step 5: Mirror the same three entries in `.claude/settings.json`**

Same three keys, same command (Claude-native events already use these exact names — no translation needed here, unlike the `.agent/settings.json` → plugin pipeline).

- [ ] **Step 6: Rebuild the plugin and verify the packaging test**

Run:
```bash
npm --prefix mcp-server run build && node scripts/build-mindforge-plugin.js
node tests/plugin-packaging.test.js
```
Expected: pass — the plugin's `hooks/hooks.json` now includes the three new events as full matching tuples against `.agent/settings.json`, and `scripts/hooks/mindforge-lifecycle-audit-hook.js` (the copied/rebased path) exists in the built plugin tree.

- [ ] **Step 7: Add one narrow assertion to `tests/plugin-packaging.test.js`**

Near the existing hook-tuple-comparison tests (search for `hookIdSet` in that file), add:

```js
test('plugin hooks.json registers the new lifecycle audit events', () => {
  const hooks = readJson(path.join(PLUGIN, 'hooks', 'hooks.json')).hooks;
  for (const evt of ['PreCompact', 'SubagentStart', 'SubagentStop']) {
    assert.ok(hooks[evt] && hooks[evt].length > 0, `missing ${evt} in built hooks.json`);
  }
});
```

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: all pass, including the pre-existing hook-sync tests this task's changes must not break.

- [ ] **Step 9: Commit**

```bash
git add .agent/hooks/mindforge-lifecycle-audit-hook.js .agent/settings.json .claude/settings.json scripts/build-mindforge-plugin.js plugins/mindforge/hooks/hooks.json plugins/mindforge/scripts/hooks/ tests/plugin-packaging.test.js
git commit -m "feat(hooks): register PreCompact/SubagentStart/SubagentStop audit-visibility hooks"
```

---

## Phase 6 — Discovery spike (not implementation)

Two research findings need feasibility verification before any code task can be honestly written for them. This phase produces a short written finding, not shipped code.

### Task 6: Scope Tool Search Tool / `defer_loading` feasibility for a Claude Code plugin author

**Files:**
- Create: `docs/research/2026-09-tool-search-defer-loading-spike.md`

- [ ] **Step 1: Determine whether `defer_loading` is a Messages-API-level parameter (controlled by whoever calls the API) or something a Claude Code *plugin* manifest/command can request**

Check `plugins/mindforge/.claude-plugin/plugin.json`'s schema (`https://json.schemastore.org/claude-code-plugin-manifest.json`, already referenced at the top of that file) for any `tools`/`toolSearch`/`defer_loading`-shaped field. If the schema has no such field, this confirms `defer_loading` is an Anthropic-API-consumer-level control (i.e. something Claude Code *itself* decides when calling the model on the plugin's behalf), not something `mindforge-cc` can turn on from inside a plugin — which would mean this optimization isn't actionable from MindForge's side at all, and the finding should say so plainly rather than inventing a workaround.

- [ ] **Step 2: Write the finding**

Document the answer (whichever it is) in the new file, with the exact schema URL checked and the exact field (or absence of one) found. If actionable, this becomes Phase 7's real implementation task in a follow-up plan. If not actionable, state that plainly and close the item.

- [ ] **Step 3: Commit**

```bash
git add docs/research/2026-09-tool-search-defer-loading-spike.md
git commit -m "docs(research): scope Tool Search Tool defer_loading feasibility for plugin authors"
```

### Task 7: Scope static/embedding-free embedding models for MindForge's memory layer

**Files:**
- Create: `docs/research/2026-09-static-embeddings-spike.md`

- [ ] **Step 1: Locate MindForge's current embedding call site**

```bash
grep -rln "embedding\|Embedding" bin/memory/*.js | head -10
```

Read whichever file(s) that finds to determine: does MindForge currently call an external embedding model at all, or does its RRF fusion operate on keyword/BM25 scores only (in which case "static embedding models" is a *new* capability to add, not a swap)? The research finding described a Sentence Transformers static-embedding technique, but whether it applies depends entirely on what MindForge's retrieval currently does — verify before assuming.

- [ ] **Step 2: Write the finding**

Document what was found in Step 1, and whether/how a static-embedding model (per the research: ~30-second distillation from any existing sentence-transformer, no native dependency since it's a lookup-table computation, not a compiled binary) would plug into the current retrieval code — with the exact file and function name it would modify, or a clear statement that no current call site exists and this would be new functionality requiring its own separate plan.

- [ ] **Step 3: Commit**

```bash
git add docs/research/2026-09-static-embeddings-spike.md
git commit -m "docs(research): scope static embedding model adoption for the memory layer"
```

---

## Self-Review

**Spec coverage:** Every item this plan carries forward from the 10-pass research is covered by a task (Phases 1-2: MCP capabilities; Phase 3: subagent hardening; Phase 4: skill hardening; Phase 5: hook coverage; Phase 6: the two items needing feasibility verification before implementation). Two items the original synthesis listed (MCP-01, LOCK-01) are explicitly excluded with the evidence found during planning — not silently dropped. Items outside this plan's scope by design: the internal report's own broader backlog (REG-01 hook *registration on real installs*, the synthetic cost ledger, 0.00 retrieval recall) — those are pre-existing, larger, and already tracked in `docs/research/2026-08-v12-upgrade-report.md`; this plan does not re-plan them.

**Placeholder scan:** No "TBD"/"handle appropriately"/"similar to Task N" patterns — every step has real code, or (Phase 6 only) a concrete discovery command with a stated decision criterion.

**Type consistency:** `appendAuditEntrySync(auditPath, event)` signature is used identically in Task 5 as confirmed against its real definition at `bin/autonomous/audit-writer.js:91,140`. `server.registerPrompt(name, config, callback)` and the elicitation call shape in Tasks 1-2 are confirmed against the vendored `.d.ts`, not invented.

**Review Focus:** Each of the four items above has its test named explicitly inside the owning task (Task 6/7 for the tool-collision/denial risks, Task 8's manual-invocability assertion for skills, Task 5's Gemini-degrade requirement built into the hook script itself, Task 1/2's smoke-test literal-count re-verification instruction).
