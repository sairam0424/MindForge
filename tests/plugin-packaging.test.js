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

test('mindforge plugin bundles the full surface (174 cmds, 154 agents, 74 skills)', () => {
  assert.strictEqual(listMd(path.join(PLUGIN, 'commands')).length, 174,
    'expected 174 commands in plugin');
  assert.strictEqual(listMd(path.join(PLUGIN, 'agents')).length, 154,
    'expected 154 agents in plugin');
  const skillDirs = fs.readdirSync(path.join(PLUGIN, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(PLUGIN, 'skills', e.name, 'SKILL.md')));
  assert.strictEqual(skillDirs.length, 74, 'expected 74 skills (73 + mindforge-protocol)');
  assert.ok(skillDirs.some((d) => d.name === 'mindforge-protocol'),
    'the CLAUDE.md directive must ship as the mindforge-protocol skill');
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

// ── 5. Total agent count across packs == 154 ──────────────────────────────────
test('the 10 category packs list 154 agents in total', () => {
  let total = 0;
  for (const dir of fs.readdirSync(CATEGORIES, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const mp = path.join(CATEGORIES, dir.name, '.claude-plugin', 'plugin.json');
    if (fs.existsSync(mp)) total += readJson(mp).agents.length;
  }
  assert.strictEqual(total, 154, `expected 154 agents across packs, got ${total}`);
});

// ── 6. Bundled MCP server (Phase 3) ───────────────────────────────────────────
test('plugin bundles the MCP server: .mcp.json + compiled dist + runtime package.json', () => {
  const mcpJsonPath = path.join(PLUGIN, '.mcp.json');
  assert.ok(fs.existsSync(mcpJsonPath), 'missing plugins/mindforge/.mcp.json');
  const cfg = readJson(mcpJsonPath);
  const srv = cfg.mcpServers && cfg.mcpServers.mindforge;
  assert.ok(srv, '.mcp.json must define an mcpServers.mindforge entry');

  // The compiled server entrypoint must be COMMITTED (a github-source install copies it;
  // an unbuilt dist would mean no MCP server). Guards the .gitignore dist/ negation.
  const entry = path.join(PLUGIN, 'mcp', 'dist', 'index.js');
  assert.ok(fs.existsSync(entry), 'missing compiled plugins/mindforge/mcp/dist/index.js (run build-mindforge-plugin.js after building mcp-server)');

  // The args must point at the bundled entry via ${CLAUDE_PLUGIN_ROOT}, and deps must load
  // from ${CLAUDE_PLUGIN_DATA} (the documented persistent-data pattern — node_modules is not bundled).
  assert.ok(srv.args.some((a) => a.includes('${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js')),
    '.mcp.json args must reference ${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js');
  assert.ok(srv.env && srv.env.NODE_PATH && srv.env.NODE_PATH.includes('${CLAUDE_PLUGIN_DATA}'),
    'MCP server NODE_PATH must point into ${CLAUDE_PLUGIN_DATA}');

  // node_modules must NOT be bundled (it is installed at runtime); keeps the plugin small.
  assert.ok(!fs.existsSync(path.join(PLUGIN, 'mcp', 'node_modules')),
    'mcp/node_modules must NOT be committed — it installs into ${CLAUDE_PLUGIN_DATA} at SessionStart');

  // The runtime package.json declares the deps the SessionStart hook installs.
  const runtimePkg = readJson(path.join(PLUGIN, 'mcp', 'package.json'));
  assert.ok(runtimePkg.dependencies && runtimePkg.dependencies['@modelcontextprotocol/sdk'],
    'mcp/package.json must declare @modelcontextprotocol/sdk for the runtime install');
});

test('a SessionStart hook installs the MCP deps into ${CLAUDE_PLUGIN_DATA}', () => {
  const hooks = readJson(path.join(PLUGIN, 'hooks', 'hooks.json')).hooks;
  const sessionStart = hooks.SessionStart || [];
  const commands = sessionStart.flatMap((g) => (g.hooks || []).map((h) => h.command || ''));
  assert.ok(
    commands.some((c) => c.includes('npm install') && c.includes('${CLAUDE_PLUGIN_DATA}/mcp')),
    'expected a SessionStart hook that npm-installs MCP deps into ${CLAUDE_PLUGIN_DATA}/mcp'
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
