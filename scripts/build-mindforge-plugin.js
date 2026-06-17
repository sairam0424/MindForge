#!/usr/bin/env node
/**
 * MindForge — comprehensive Claude Code plugin generator (Phase 2).
 *
 * Generates `plugins/mindforge/`, the single plugin that bundles MindForge's full
 * surface so a user can `/plugin install mindforge@mindforge`:
 *   - commands/  ← 174 slash commands (from .claude/commands/mindforge)
 *   - agents/    ← 154 subagents (flattened from subagents/categories/NN)
 *   - skills/    ← 73 skills (from .agent/skills) + the synthesized mindforge-protocol skill
 *   - hooks/hooks.json ← translated from .agent/settings.json (event names + paths rebased)
 *   - scripts/   ← the hook .js files (referenced via ${CLAUDE_PLUGIN_ROOT})
 *   - .claude-plugin/plugin.json
 *
 * COPY, don't symlink: a github-source plugin install copies the plugin directory from
 * the repo; symlinks pointing outside the plugin dir are dropped, and Windows symlink
 * support is unreliable. Copying is deterministic and cross-platform; Phase 4 adds a CI
 * drift-check so the copies can't silently diverge from their canonical sources.
 *
 * Single source of truth: edit the canonical assets (or this script), never the
 * generated plugins/mindforge/ tree. Re-run: node scripts/build-mindforge-plugin.js
 *
 * Schema authority: code.claude.com/docs/en/plugins-reference
 *  - components live at the PLUGIN ROOT (commands/ agents/ skills/ hooks/), never in .claude-plugin/
 *  - a CLAUDE.md at the plugin root is NOT loaded as context -> ship directives as a skill
 *  - plugin agents may NOT declare hooks/mcpServers/permissionMode (audited clean already)
 *  - hook commands use Claude events (PreToolUse/PostToolUse/...) + ${CLAUDE_PLUGIN_ROOT}
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN = path.join(ROOT, 'plugins', 'mindforge');

const SRC = {
  commands: path.join(ROOT, '.claude', 'commands', 'mindforge'),
  categories: path.join(ROOT, 'subagents', 'categories'),
  skills: path.join(ROOT, '.agent', 'skills'),
  hooks: path.join(ROOT, '.agent', 'hooks'),
  claudeMd: path.join(ROOT, '.agent', 'CLAUDE.md'),
};

const pkgVersion = require(path.join(ROOT, 'package.json')).version;

// ── fs helpers ────────────────────────────────────────────────────────────────
function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function ensure(p) { fs.mkdirSync(p, { recursive: true }); }
function copyFile(s, d) { ensure(path.dirname(d)); fs.copyFileSync(s, d); }
function listMd(dir) {
  return fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    : [];
}

// ── 1. Commands (flat .md) ──────────────────────────────────────────────────────
function buildCommands() {
  const dst = path.join(PLUGIN, 'commands');
  ensure(dst);
  let n = 0;
  for (const f of listMd(SRC.commands)) { copyFile(path.join(SRC.commands, f), path.join(dst, f)); n++; }
  return n;
}

// ── 2. Agents (flatten 154 from category tree; basenames already collision-free) ──
function buildAgents() {
  const dst = path.join(PLUGIN, 'agents');
  ensure(dst);
  let n = 0;
  for (const cat of fs.readdirSync(SRC.categories, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catDir = path.join(SRC.categories, cat.name);
    for (const f of listMd(catDir)) { copyFile(path.join(catDir, f), path.join(dst, f)); n++; }
  }
  return n;
}

// ── 3. Skills (<name>/SKILL.md dirs) + synthesized mindforge-protocol skill ───────
function buildSkills() {
  const dst = path.join(PLUGIN, 'skills');
  ensure(dst);
  let n = 0;
  if (fs.existsSync(SRC.skills)) {
    for (const entry of fs.readdirSync(SRC.skills, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(SRC.skills, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      copyFile(skillMd, path.join(dst, entry.name, 'SKILL.md'));
      n++;
    }
  }
  buildProtocolSkill(dst);
  return n + 1;
}

/**
 * The CLAUDE.md framework directive cannot load from a plugin root (Claude ignores it),
 * so it ships as a model-invocable skill. The skill front-loads the MindForge operating
 * protocol whenever a session needs the framework's orchestration/governance rules.
 */
function buildProtocolSkill(skillsDst) {
  const body = fs.readFileSync(SRC.claudeMd, 'utf8')
    // Drop the leading H1 so the skill's own heading owns the doc.
    .replace(/^#\s+MindForge[^\n]*\n/, '')
    .trim();
  const frontmatter =
    '---\n' +
    'name: mindforge-protocol\n' +
    'description: >-\n' +
    '  The MindForge operating protocol — swarm orchestration, sharded memory, the\n' +
    '  adversarial decision loop, quality gates, and the session-start governance\n' +
    '  checklist. Use at the start of any MindForge session, or whenever coordinating\n' +
    '  multi-agent work, planning/executing phases, or enforcing security/verification gates.\n' +
    '---\n\n';
  const content =
    frontmatter +
    '# MindForge Operating Protocol\n\n' +
    'Activate this protocol for MindForge-governed work. It mirrors the framework ' +
    'directive that the npx installer writes to `CLAUDE.md`; as a plugin it loads ' +
    'as a skill instead.\n\n' +
    body + '\n';
  const dir = path.join(skillsDst, 'mindforge-protocol');
  ensure(dir);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');
}

// ── 4. Hooks: copy scripts + translate settings to a plugin hooks.json ────────────
// Map the Gemini-CLI event vocabulary used in .agent/settings.json to Claude Code's
// plugin hook events. A hook under an unrecognized event name silently never fires.
const EVENT_MAP = { SessionStart: 'SessionStart', BeforeTool: 'PreToolUse', AfterTool: 'PostToolUse' };

function buildHooks(mcpBundled) {
  const scriptsDst = path.join(PLUGIN, 'scripts');
  ensure(scriptsDst);
  for (const f of fs.readdirSync(SRC.hooks)) {
    if (f.endsWith('.js')) copyFile(path.join(SRC.hooks, f), path.join(scriptsDst, f));
  }

  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.agent', 'settings.json'), 'utf8'));
  const out = {};
  for (const [event, groups] of Object.entries(settings.hooks || {})) {
    const claudeEvent = EVENT_MAP[event];
    if (!claudeEvent) continue; // skip events with no Claude equivalent
    out[claudeEvent] = groups.map((group) => ({
      ...(group.matcher ? { matcher: group.matcher } : {}),
      hooks: (group.hooks || []).map((h) => ({
        ...h,
        // Rebase `node .agent/hooks/x.js` -> `node "${CLAUDE_PLUGIN_ROOT}/scripts/x.js"`
        command: h.command.replace(
          /node\s+\.agent\/hooks\/([\w.-]+\.js)/,
          'node "${CLAUDE_PLUGIN_ROOT}/scripts/$1"'
        ),
      })),
    }));
  }

  // NB: no MCP dependency-install hook. The MCP server ships as a single self-contained
  // esbuild bundle (all deps inlined), so there is nothing to install at runtime — the
  // server starts directly from ${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js. (The earlier
  // lazy-npm-install-into-${CLAUDE_PLUGIN_DATA} approach failed: Claude Code auto-starts
  // the stdio server at session start, before any install hook could provision deps.)
  void mcpBundled;

  const hooksDir = path.join(PLUGIN, 'hooks');
  ensure(hooksDir);
  fs.writeFileSync(path.join(hooksDir, 'hooks.json'), JSON.stringify({ hooks: out }, null, 2) + '\n', 'utf8');
  return Object.keys(out).length;
}

// ── 4b. MCP server: bundle the self-contained single-file build, emit .mcp.json ───
// The server ships as ONE esbuild bundle (mcp-server/dist/index.js, ~750KB) with all deps
// (@modelcontextprotocol/sdk, zod, transitive tree) inlined. So the plugin needs NO runtime
// node_modules and NO install step — the stdio server starts directly on first session,
// offline. (An audit caught that the prior lazy-install-into-${CLAUDE_PLUGIN_DATA} approach
// left a clean install with empty deps because Claude Code auto-starts the server before any
// hook can install them.) projectRoot resolves to ${CLAUDE_PROJECT_DIR} inside the server.
function buildMcp() {
  const mcpEntry = path.join(ROOT, 'mcp-server', 'dist', 'index.js');
  if (!fs.existsSync(mcpEntry)) {
    console.log('  mcp: SKIPPED (mcp-server/dist/index.js not built — run `npm --prefix mcp-server run build`)');
    return false;
  }
  const mcpDistDst = path.join(PLUGIN, 'mcp', 'dist');
  ensure(mcpDistDst);

  // Bundle the single self-contained file (no vendor/, no node_modules, no package.json needed).
  fs.copyFileSync(mcpEntry, path.join(mcpDistDst, 'index.js'));

  // .mcp.json at plugin root: launch the bundled server over stdio. No NODE_PATH — deps are
  // inlined. CLAUDE_PROJECT_DIR scopes the server's reads to the user's project.
  const mcpConfig = {
    mcpServers: {
      mindforge: {
        command: 'node',
        args: ['${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js'],
        env: {
          CLAUDE_PROJECT_DIR: '${CLAUDE_PROJECT_DIR}',
        },
      },
    },
  };
  fs.writeFileSync(path.join(PLUGIN, '.mcp.json'), JSON.stringify(mcpConfig, null, 2) + '\n', 'utf8');
  return true;
}

/** Recursively copy a directory (files + subdirs). */
function copyDirRecursive(src, dst) {
  ensure(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ── 5. Manifest ───────────────────────────────────────────────────────────────
function buildManifest(counts) {
  const manifest = {
    $schema: 'https://json.schemastore.org/claude-code-plugin-manifest.json',
    name: 'mindforge',
    displayName: 'MindForge',
    version: pkgVersion,
    description:
      'Sovereign Agentic Intelligence for Claude Code — ' +
      `${counts.commands} commands, ${counts.agents} subagents, ${counts.skills} skills, ` +
      'and governance hooks. The full MindForge framework as one plugin.',
    author: { name: 'MindForge Team', email: 'uggesairam0000@gmail.com' },
    homepage: 'https://github.com/sairam0424/MindForge#readme',
    repository: 'https://github.com/sairam0424/MindForge',
    license: 'MIT',
    keywords: ['agentic', 'orchestration', 'swarm', 'governance', 'mindforge', 'claude-code'],
  };
  ensure(path.join(PLUGIN, '.claude-plugin'));
  fs.writeFileSync(
    path.join(PLUGIN, '.claude-plugin', 'plugin.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );
}

// ── Run ──────────────────────────────────────────────────────────────────────
// Rebuild from scratch so deletions in source propagate (no stale files linger).
for (const sub of ['commands', 'agents', 'skills', 'hooks', 'scripts', 'mcp', '.claude-plugin']) {
  rmrf(path.join(PLUGIN, sub));
}
rmrf(path.join(PLUGIN, '.mcp.json'));

// Build the MCP bundle first so buildHooks knows whether to add the dep-install hook.
const mcpBundled = buildMcp();
const counts = {
  commands: buildCommands(),
  agents: buildAgents(),
  skills: buildSkills(),
  hookEvents: buildHooks(mcpBundled),
};
buildManifest(counts);

console.log('Generated plugins/mindforge/:');
console.log(`  commands: ${counts.commands}`);
console.log(`  agents:   ${counts.agents}`);
console.log(`  skills:   ${counts.skills} (incl. synthesized mindforge-protocol)`);
console.log(`  hook events: ${counts.hookEvents}`);
console.log(`  mcp server: ${mcpBundled ? 'bundled (.mcp.json + mcp/dist)' : 'not bundled'}`);
