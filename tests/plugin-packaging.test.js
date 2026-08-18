/**
 * MindForge — Claude Code Plugin Packaging Regression Tests
 *
 * Guards the generated plugin distribution (Phases 1-2):
 *   - .claude-plugin/marketplace.json (repo-root catalog)
 *   - plugins/mindforge/ (the comprehensive plugin)
 *   - subagents/categories/NN/.claude-plugin/plugin.json (the 10 packs)
 *
 * The plugin tree is GENERATED from canonical sources and COMMITTED, so the standing
 * risk is drift: someone edits a source command/agent/skill and forgets to re-run the
 * generators, shipping a stale plugin. This test asserts structural invariants that
 * would break a real `/plugin install`, plus the YAML-frontmatter validity that
 * `claude plugin validate` enforces (the class of bug that silently loaded empty
 * metadata before the frontmatter fix). Plain node assert, mirrors subagent-import.test.js.
 *
 * Run: node tests/plugin-packaging.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const ROOT = path.resolve(__dirname, '..');
const MARKETPLACE = path.join(ROOT, '.claude-plugin', 'marketplace.json');
const PLUGIN = path.join(ROOT, 'plugins', 'mindforge');
const CATEGORIES = path.join(ROOT, 'subagents', 'categories');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function listMd(dir) {
  return fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    : [];
}

// Parse the leading YAML frontmatter block's scalar fields well enough to detect the
// "loads empty" failure mode: a value that is neither a quoted scalar nor a plain
// scalar free of the YAML-breaking tokens (leading -, @, embedded ": ", trailing :).
function frontmatterIsParseable(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!m) return true; // no frontmatter is not a parse failure
  for (const line of m[1].split('\n')) {
    const fm = line.match(/^(name|description):\s*(.*)$/);
    if (!fm) continue;
    const v = fm[2].trim();
    if (v === '') continue;
    if (v.startsWith('"') || v.startsWith('>') || v.startsWith('|') || v.startsWith('\'')) continue;
    // Plain scalar: reject the tokens that made the real source files mis-parse.
    if (v.startsWith('-') || v.startsWith('@') || /:\s/.test(v) || v.endsWith(':')) return false;
  }
  return true;
}

// ── 1. Marketplace catalog ────────────────────────────────────────────────────
test('repo-root marketplace.json exists, is valid JSON, schema-correct', () => {
  assert.ok(fs.existsSync(MARKETPLACE), 'missing .claude-plugin/marketplace.json at repo root');
  const mp = readJson(MARKETPLACE);
  assert.strictEqual(mp.name, 'mindforge', 'marketplace name must be "mindforge"');
  assert.ok(mp.owner && mp.owner.name, 'owner.name required');
  assert.ok(!mp.owner.url, 'owner.url is not a schema field (use name+email)');
  assert.ok(Array.isArray(mp.plugins) && mp.plugins.length >= 11,
    `expected >=11 plugins (mindforge + 10 packs), got ${mp.plugins && mp.plugins.length}`);
});

test('every marketplace plugin source resolves on disk', () => {
  const mp = readJson(MARKETPLACE);
  for (const p of mp.plugins) {
    assert.ok(typeof p.source === 'string' && p.source.startsWith('./'),
      `plugin ${p.name} source must be a "./"-relative path, got ${JSON.stringify(p.source)}`);
    const dir = path.join(ROOT, p.source);
    assert.ok(fs.existsSync(path.join(dir, '.claude-plugin', 'plugin.json')),
      `plugin ${p.name}: no plugin.json at ${p.source}`);
  }
});

// ── 2. Comprehensive mindforge plugin ─────────────────────────────────────────
test('mindforge plugin manifest is correct and components live at plugin root', () => {
  const manifest = readJson(path.join(PLUGIN, '.claude-plugin', 'plugin.json'));
  assert.strictEqual(manifest.name, 'mindforge');
  // The #1 documented mistake: components must NOT be inside .claude-plugin/.
  for (const sub of ['commands', 'agents', 'skills', 'hooks']) {
    assert.ok(fs.existsSync(path.join(PLUGIN, sub)), `missing plugins/mindforge/${sub}/`);
    assert.ok(!fs.existsSync(path.join(PLUGIN, '.claude-plugin', sub)),
      `${sub}/ must be at plugin root, not inside .claude-plugin/`);
  }
});

// Hardcoded counts (182 commands / 74 skills) and no version check used to stand here. They
// did not DETECT drift — they PINNED it. The sources had grown to 221 commands and 123 skills
// and the version to 11.9.2 while the committed plugin still held 182, 74 and 11.5.1, and this
// test passed anyway because it asserted the stale numbers. Compare against the canonical
// sources instead, so a forgotten `node scripts/build-mindforge-plugin.js` fails the suite.
test('mindforge plugin surface matches its canonical sources (no generator drift)', () => {
  const plugCommands = listMd(path.join(PLUGIN, 'commands')).length;
  const srcCommands = listMd(path.join(ROOT, '.claude', 'commands', 'mindforge')).length;
  assert.strictEqual(plugCommands, srcCommands,
    `plugin commands (${plugCommands}) != .claude/commands/mindforge (${srcCommands}) — re-run scripts/build-mindforge-plugin.js`);

  let srcAgents = 0;
  for (const d of fs.readdirSync(CATEGORIES, { withFileTypes: true })) {
    if (d.isDirectory()) srcAgents += listMd(path.join(CATEGORIES, d.name)).length;
  }
  const plugAgents = listMd(path.join(PLUGIN, 'agents')).length;
  assert.strictEqual(plugAgents, srcAgents,
    `plugin agents (${plugAgents}) != subagents/categories (${srcAgents}) — re-run scripts/build-mindforge-plugin.js`);

  const srcSkillsDir = path.join(ROOT, '.agent', 'skills');
  const srcSkills = fs.readdirSync(srcSkillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(srcSkillsDir, e.name, 'SKILL.md')));
  const skillDirs = fs.readdirSync(path.join(PLUGIN, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(PLUGIN, 'skills', e.name, 'SKILL.md')));
  // +1 for mindforge-protocol, which the generator synthesizes from .agent/CLAUDE.md.
  assert.strictEqual(skillDirs.length, srcSkills.length + 1,
    `plugin skills (${skillDirs.length}) != .agent/skills + mindforge-protocol (${srcSkills.length + 1}) — re-run scripts/build-mindforge-plugin.js`);
  assert.ok(skillDirs.some((d) => d.name === 'mindforge-protocol'),
    'the CLAUDE.md directive must ship as the mindforge-protocol skill');

  // tests/version-consistency.test.js does not cover the plugin manifest, which is how it
  // sat at 11.5.1 through four releases while the marketplace advertised that version.
  const manifestVersion = readJson(path.join(PLUGIN, '.claude-plugin', 'plugin.json')).version;
  const pkgVersion = readJson(path.join(ROOT, 'package.json')).version;
  assert.strictEqual(manifestVersion, pkgVersion,
    `plugin manifest version (${manifestVersion}) != package.json (${pkgVersion}) — re-run scripts/build-mindforge-plugin.js`);
});

test('mindforge plugin hooks use Claude event names + ${CLAUDE_PLUGIN_ROOT}', () => {
  const hooks = readJson(path.join(PLUGIN, 'hooks', 'hooks.json')).hooks;
  const events = Object.keys(hooks);
  // Must be translated from the Gemini-CLI vocabulary, not left as BeforeTool/AfterTool.
  assert.ok(!events.includes('BeforeTool') && !events.includes('AfterTool'),
    `hooks must use Claude events, found Gemini names: ${events.join(', ')}`);
  for (const groups of Object.values(hooks)) {
    for (const g of groups) {
      for (const h of g.hooks || []) {
        if (/node\s+\.agent\/hooks\//.test(h.command)) {
          assert.fail(`hook still references .agent/hooks (must be \${CLAUDE_PLUGIN_ROOT}/scripts): ${h.command}`);
        }
      }
    }
  }
});

// ── 2b. Hook wiring: every hook must resolve to a script that exists ──────────
// The bug: scripts/build-mindforge-plugin.js copied .agent/hooks/ FLATLY, so
// .agent/hooks/lib/ (hook-flags.js, pretooluse-visible-output.js) never reached the plugin and
// every hook exited 1 with `Cannot find module './lib/hook-flags'` on its first fire. Fixing
// only the copy would have been WORSE than the crash: run-with-flags.js resolves its
// target-script argument against ${CLAUDE_PLUGIN_ROOT}, so a command still spelling
// `.agent/hooks/x.js` resolves to <plugin>/.agent/hooks/x.js, prints "[Hook] Script not
// found", and exits 0 — mindforge-block-no-verify and trust-gate would then report success
// while gating nothing. So assert RESOLVABILITY, not hook counts.
const PLUGIN_ROOT_PREFIX = '${CLAUDE_PLUGIN_ROOT}/';

/** Flatten a settings-style hooks object into { event, command } pairs. */
function hookCommands(hooksObj) {
  return Object.entries(hooksObj).flatMap(([event, groups]) =>
    groups.flatMap((g) => (g.hooks || []).map((h) => ({ event, command: h.command })))
  );
}

/** `node <launcher> <hookId> <script> [profiles]` -> { hookId, launcher, script }. */
function parseHookCommand(command) {
  const tokens = command.split(' ').map((t) => t.replace(/^"|"$/g, ''));
  const scripts = tokens.filter((t) => t.endsWith('.js'));
  return { hookId: tokens[2] || '', launcher: scripts[0], script: scripts[1] };
}

function assertRepoHooksResolve(label, settingsPath) {
  const cmds = hookCommands(readJson(settingsPath).hooks);
  assert.ok(cmds.length > 0, `${label} declares no hooks`);
  for (const { event, command } of cmds) {
    const { launcher, script } = parseHookCommand(command);
    assert.ok(launcher, `${label} ${event}: no launcher script parsed from: ${command}`);
    for (const rel of [launcher, script].filter(Boolean)) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)),
        `${label} ${event}: hook script does not exist: ${rel} — run-with-flags.js prints "Script not found" and exits 0, so the hook is a silent no-op`);
    }
  }
}

// These two resolve against the REPO root, which is the only root where they resolve. The names
// used to read "every hook ... resolves to a script on disk", which invited exactly the wrong
// inference: that hooks resolve where they RUN. They do not. Measured on a real
// `node bin/install.js --claude --local`, ZERO of the eight registered command paths resolve,
// because the scripts install to .claude/hooks/ while the commands name .agent/hooks/ and bin/.
// The gap is pinned executably by the test below, so these two cannot be mistaken for evidence
// that hook enforcement works.
test('every hook in .claude/settings.json resolves against the REPO root (local dev only)', () => {
  assertRepoHooksResolve('.claude/settings.json', path.join(ROOT, '.claude', 'settings.json'));
});

test('every hook in .agent/settings.json resolves against the REPO root (local dev only)', () => {
  assertRepoHooksResolve('.agent/settings.json', path.join(ROOT, '.agent', 'settings.json'));
});

test('PINNED GAP: the repo hook paths resolve in NO install (REG-01 not yet done)', () => {
  // Executable record of the enforcement gap, and the tripwire that forces this test to be
  // rewritten the moment REG-01 lands.
  //
  // Why a pinned count rather than an aspiration: an install writes no registration at all, so
  // there is nothing to assert "works" yet. What CAN be asserted is the precise current state —
  // and pinning it means a PARTIAL fix (some paths resolving, some not) fails here. That matters
  // more than it sounds: run-with-flags.js:132-136 echoes stdin and exits 0 on a missing script,
  // which Claude Code reads as ALLOW, so a half-wired config is strictly worse than none. The
  // repo's own generator says so at scripts/build-mindforge-plugin.js:176-183.
  const { spawnSync } = require('child_process');
  const os = require('os');
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-hookgap-')));
  try {
    fs.writeFileSync(path.join(project, 'package.json'),
      JSON.stringify({ name: 'their-app', version: '1.0.0' }, null, 2));
    // HOME confined to the scratch project, NOT the operator's. This call site is the ORIGINAL
    // instance of the leak: installer-core.js:253 resolves its registry through os.homedir(), which
    // honours $HOME, so every `npm test` — including each Husky pre-commit — appended a mf-hookgap-*
    // path to the developer's real ~/.mindforge/registry.json. Measured before the fix: 237 of 245
    // entries were test temp dirs (97%), 41 from this prefix. Four other suites had copied the
    // pattern from here. tests/no-home-leak.test.js now bans it repo-wide.
    const homeDir = path.join(project, '.scratch-home');
    fs.mkdirSync(homeDir, { recursive: true });
    const r = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'install.js'), '--claude', '--local'], {
      cwd: project, encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: homeDir, CI: '1' },
    });
    assert.strictEqual(r.status, 0, `install failed: ${(r.stderr || '').slice(0, 600)}`);

    // An install writes no registration whatsoever.
    for (const rel of ['.claude/settings.json', '.claude/settings.local.json', '.agent/settings.json']) {
      assert.ok(!fs.existsSync(path.join(project, rel)),
        `${rel} now EXISTS in an install. If REG-01 has landed, replace this pinned-gap test with ` +
        'a real assertion: every emitted command path must resolve, and a deny payload must be ' +
        'answered with exit 2.');
    }

    // And the repo's own command paths resolve nowhere in that install.
    const cmds = hookCommands(readJson(path.join(ROOT, '.claude', 'settings.json')).hooks);
    const resolved = [];
    for (const { command } of cmds) {
      const { launcher, script } = parseHookCommand(command);
      for (const rel of [launcher, script].filter(Boolean)) {
        if (fs.existsSync(path.join(project, rel))) resolved.push(rel);
      }
    }
    assert.deepStrictEqual(resolved, [],
      `${resolved.length} of the repo's registered hook paths resolve in an install: ` +
      `${resolved.join(', ')}. Any nonzero count means the layout changed — re-derive the ` +
      'registration rather than leaving a partially-resolving config, which fails OPEN.');

    // The scripts DID install — just not where the commands look. That distinction is the whole
    // finding, so assert it rather than leaving "nothing resolves" ambiguous with "nothing shipped".
    assert.ok(fs.existsSync(path.join(project, '.claude', 'hooks', 'run-with-flags.js')),
      'the dispatcher must be present at .claude/hooks/ — if it is absent the diagnosis above is ' +
      'wrong and the problem is the copy, not the paths');
    assert.ok(!fs.existsSync(path.join(project, '.claude', 'hooks', 'trust-gate-hook.js')),
      'trust-gate-hook.js is expected ABSENT from a default install (it lives under bin/security/, ' +
      'which only --with-utils copies). If it is now present, the bundle changed.');
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('every plugin hook resolves under the plugin root, require()d deps included', () => {
  const cmds = hookCommands(readJson(path.join(PLUGIN, 'hooks', 'hooks.json')).hooks);
  assert.ok(cmds.length > 0, 'plugin hooks.json declares no hooks');
  for (const { event, command } of cmds) {
    const { launcher, script } = parseHookCommand(command);
    assert.ok(launcher, `${event}: no launcher script parsed from: ${command}`);
    for (const raw of [launcher, script].filter(Boolean)) {
      // BOTH halves must be rebased; a bare .agent/hooks/ or bin/ path is the silent no-op.
      assert.ok(raw.startsWith(PLUGIN_ROOT_PREFIX),
        `${event}: plugin hook path is not rebased onto \${CLAUDE_PLUGIN_ROOT}: ${raw}`);
      const rel = raw.slice(PLUGIN_ROOT_PREFIX.length);
      assert.ok(fs.existsSync(path.join(PLUGIN, rel)),
        `${event}: script missing from the plugin: ${rel} (re-run scripts/build-mindforge-plugin.js)`);
    }
  }
  // run-with-flags.js require()s these at module scope; the flat copy dropped them, which is
  // why every plugin hook exited 1 with MODULE_NOT_FOUND.
  for (const dep of ['lib/hook-flags.js', 'lib/pretooluse-visible-output.js']) {
    assert.ok(fs.existsSync(path.join(PLUGIN, 'scripts', dep)),
      `plugins/mindforge/scripts/${dep} is missing — run-with-flags.js cannot load, so every plugin hook dies on its first fire`);
  }
});

// ── 2c. Hook parity across the three configs ──────────────────────────────────
// Measured, not assumed: .claude/settings.json declares 8 hook commands, .agent/settings.json
// 7, and the generated plugin 7. The gap is exactly ONE hook id — `instinct-capture`
// (bin/hooks/instinct-capture-hook.js), which commit bbe2e8d wired into .claude/settings.json
// and never mirrored into .agent/settings.json. So the honest target is NOT "8/8/8": it is
// (a) plugin == .agent by construction, and (b) the .claude-only set pinned to that one known
// id so the divergence cannot widen unnoticed. Closing it would enable a data-writing
// PostToolUse hook on the Gemini runtime AND require bundling its dependency closure
// (bin/hooks/lib/detect-project.js, bin/utils/file-lock.js, both reached by layout-sensitive
// relative requires) into the plugin — a behaviour change that belongs in its own review.
const CLAUDE_ONLY_HOOK_IDS = ['instinct-capture'];

const hookIdSet = (hooksObj) =>
  new Set(hookCommands(hooksObj).map((c) => parseHookCommand(c.command).hookId));

test('plugin hook ids match .agent/settings.json exactly (translation fidelity)', () => {
  const agentIds = hookIdSet(readJson(path.join(ROOT, '.agent', 'settings.json')).hooks);
  const pluginIds = hookIdSet(readJson(path.join(PLUGIN, 'hooks', 'hooks.json')).hooks);
  assert.deepStrictEqual([...pluginIds].sort(), [...agentIds].sort(),
    'plugin hooks.json is out of sync with .agent/settings.json — re-run scripts/build-mindforge-plugin.js');
});

test('.claude and .agent hook sets differ only by the known instinct-capture gap', () => {
  const claudeIds = hookIdSet(readJson(path.join(ROOT, '.claude', 'settings.json')).hooks);
  const agentIds = hookIdSet(readJson(path.join(ROOT, '.agent', 'settings.json')).hooks);
  const claudeOnly = [...claudeIds].filter((id) => !agentIds.has(id)).sort();
  const agentOnly = [...agentIds].filter((id) => !claudeIds.has(id)).sort();
  assert.deepStrictEqual(agentOnly, [],
    `.agent/settings.json declares hooks Claude Code never runs: ${agentOnly.join(', ')}`);
  assert.deepStrictEqual(claudeOnly, CLAUDE_ONLY_HOOK_IDS.slice().sort(),
    `.claude vs .agent hook divergence changed (now: ${claudeOnly.join(', ') || 'none'}) — either mirror the hook into .agent/settings.json and bundle its deps into the plugin, or update CLAUDE_ONLY_HOOK_IDS deliberately`);
});

// ── 3. Frontmatter validity (the "loads empty" guard) ─────────────────────────
test('all plugin command/agent/skill frontmatter parses (no silent-empty metadata)', () => {
  const bad = [];
  for (const f of listMd(path.join(PLUGIN, 'commands')))
    if (!frontmatterIsParseable(path.join(PLUGIN, 'commands', f))) bad.push(`commands/${f}`);
  for (const f of listMd(path.join(PLUGIN, 'agents')))
    if (!frontmatterIsParseable(path.join(PLUGIN, 'agents', f))) bad.push(`agents/${f}`);
  const skillsDir = path.join(PLUGIN, 'skills');
  for (const d of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const sm = path.join(skillsDir, d.name, 'SKILL.md');
    if (fs.existsSync(sm) && !frontmatterIsParseable(sm)) bad.push(`skills/${d.name}/SKILL.md`);
  }
  assert.deepStrictEqual(bad, [], `frontmatter would load empty in: ${bad.join(', ')}`);
});

// ── 4. Per-category packs match disk (collision-rename drift guard) ───────────
test('each category plugin.json agents[] matches the .md files on disk', () => {
  for (const dir of fs.readdirSync(CATEGORIES, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const catDir = path.join(CATEGORIES, dir.name);
    const manifestPath = path.join(catDir, '.claude-plugin', 'plugin.json');
    if (!fs.existsSync(manifestPath)) continue;
    const listed = new Set(readJson(manifestPath).agents.map((a) => a.replace(/^\.\//, '')));
    const onDisk = new Set(listMd(catDir));
    assert.deepStrictEqual([...listed].sort(), [...onDisk].sort(),
      `${dir.name}: plugin.json agents[] out of sync with disk (re-run build-subagent-plugins.js)`);
  }
});

// ── 5. Total agent count across packs == 164 ──────────────────────────────────
test('the 10 category packs list 164 agents in total', () => {
  let total = 0;
  for (const dir of fs.readdirSync(CATEGORIES, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const mp = path.join(CATEGORIES, dir.name, '.claude-plugin', 'plugin.json');
    if (fs.existsSync(mp)) total += readJson(mp).agents.length;
  }
  assert.strictEqual(total, 164, `expected 164 agents across packs, got ${total}`);
});

// ── 6. Bundled MCP server (Phase 3 — self-contained single-file build) ────────
test('plugin bundles the MCP server as a self-contained single file (no runtime deps)', () => {
  const mcpJsonPath = path.join(PLUGIN, '.mcp.json');
  assert.ok(fs.existsSync(mcpJsonPath), 'missing plugins/mindforge/.mcp.json');
  const cfg = readJson(mcpJsonPath);
  const srv = cfg.mcpServers && cfg.mcpServers.mindforge;
  assert.ok(srv, '.mcp.json must define an mcpServers.mindforge entry');

  // The compiled server entrypoint must be COMMITTED (a github-source install copies it;
  // an unbuilt dist would mean no MCP server). Guards the .gitignore dist/ negation.
  const entry = path.join(PLUGIN, 'mcp', 'dist', 'index.js');
  assert.ok(fs.existsSync(entry), 'missing compiled plugins/mindforge/mcp/dist/index.js (run build-mindforge-plugin.js after building mcp-server)');

  assert.ok(srv.args.some((a) => a.includes('${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js')),
    '.mcp.json args must reference ${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js');

  // The bundle is self-contained: NO NODE_PATH (deps are inlined, not loaded from disk).
  assert.ok(!(srv.env && srv.env.NODE_PATH),
    '.mcp.json must NOT set NODE_PATH — the bundle is self-contained, not dep-loaded');

  // No runtime node_modules and no runtime package.json should be bundled — deps are inlined.
  assert.ok(!fs.existsSync(path.join(PLUGIN, 'mcp', 'node_modules')),
    'mcp/node_modules must NOT exist — deps are inlined in the bundle');
  assert.ok(!fs.existsSync(path.join(PLUGIN, 'mcp', 'package.json')),
    'mcp/package.json must NOT exist — the self-contained bundle needs no runtime install');

  // The bundle must actually inline its deps: it must NOT require the external SDK/zod at
  // runtime (esbuild rewrites those to inlined modules). A residual top-level require of an
  // external package would mean the clean-install MODULE_NOT_FOUND blocker is back.
  const bundle = fs.readFileSync(entry, 'utf8');
  assert.ok(!/require\(["']@modelcontextprotocol\/sdk/.test(bundle),
    'bundle still require()s @modelcontextprotocol/sdk — not self-contained (the clean-install blocker would recur)');
  assert.ok(!/require\(["']zod["']\)/.test(bundle),
    'bundle still require()s zod — not self-contained');
  assert.ok(bundle.length > 100_000, `bundle suspiciously small (${bundle.length} bytes) — deps may not be inlined`);
});

test('no MCP dependency-install hook remains (self-contained bundle needs none)', () => {
  const hooks = readJson(path.join(PLUGIN, 'hooks', 'hooks.json')).hooks;
  const commands = Object.values(hooks)
    .flat()
    .flatMap((g) => (g.hooks || []).map((h) => h.command || ''));
  assert.ok(
    !commands.some((c) => c.includes('npm install')),
    'no hook should run npm install — the MCP bundle is self-contained (the lazy-install pattern was the clean-install blocker)'
  );
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nPlugin Packaging: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
