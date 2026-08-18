#!/usr/bin/env node
/**
 * MindForge — comprehensive Claude Code plugin generator (Phase 2).
 *
 * Generates `plugins/mindforge/`, the single plugin that bundles MindForge's full
 * surface so a user can `/plugin install mindforge@mindforge`:
 *   - commands/  ← 221 slash commands (from .claude/commands/mindforge)
 *   - agents/    ← 164 subagents (flattened from subagents/categories/NN)
 *   - skills/    ← 123 skills (from .agent/skills) + the synthesized mindforge-protocol skill
 *   - hooks/hooks.json ← translated from .agent/settings.json (event names + paths rebased)
 *   - scripts/   ← the hook trees, copied RECURSIVELY: .agent/hooks/** (including lib/,
 *                  which run-with-flags.js require()s) and bin/security/** -> scripts/security/
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

// The esbuild bundle the plugin ships as its MCP server. NOT tracked in git (it is a local
// build artifact), so a fresh clone must build mcp-server before regenerating the plugin.
// Hoisted to module scope because the Run block preflights it BEFORE the rmrf.
const MCP_ENTRY = path.join(ROOT, 'mcp-server', 'dist', 'index.js');

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

// Every source tree a hook command may name, and where it lands under the plugin.
// bin/security is here because .agent/settings.json's trust-gate hook points at
// bin/security/trust-gate-hook.js — a path that was never bundled, so the trust gate
// could not run from a plugin install even once lib/ was fixed.
const HOOK_TREES = [
  { repoRel: '.agent/hooks', pluginRel: 'scripts' },
  { repoRel: 'bin/security', pluginRel: 'scripts/security' },
];

/**
 * Copy every hook source tree into the plugin and return a repoRel -> pluginRel map of
 * every .js file copied, keyed the way the settings files spell paths (POSIX separators).
 *
 * Recursion is load-bearing. .agent/hooks/lib/ holds hook-flags.js and
 * pretooluse-visible-output.js, which run-with-flags.js require()s at module scope. The flat
 * `readdirSync().filter(f => f.endsWith('.js'))` this replaces skipped directories silently,
 * so every plugin hook died with `Cannot find module './lib/hook-flags'` on its first fire.
 */
function copyHookTrees() {
  const rewrite = new Map();
  for (const { repoRel, pluginRel } of HOOK_TREES) {
    const src = path.join(ROOT, ...repoRel.split('/'));
    if (!fs.existsSync(src)) {
      throw new Error(`build-mindforge-plugin: hook source tree missing: ${repoRel}`);
    }
    copyDirRecursive(src, path.join(PLUGIN, ...pluginRel.split('/')));
    for (const rel of listJsRecursive(src)) rewrite.set(`${repoRel}/${rel}`, `${pluginRel}/${rel}`);
  }
  return rewrite;
}

/**
 * Rebase every script path in a hook command onto the plugin tree.
 *
 * BOTH halves must be rebased, not just the launcher. run-with-flags.js resolves its
 * <scriptRelativePath> argument against getHookRoot(), which is ${CLAUDE_PLUGIN_ROOT} in a
 * plugin install — so a command left saying `.agent/hooks/x.js` resolved to
 * <plugin>/.agent/hooks/x.js, which does not exist. The launcher then printed
 * "[Hook] Script not found" and exited 0: the hook looked installed and did nothing. For
 * mindforge-block-no-verify and trust-gate that is a silent security bypass, strictly worse
 * than the MODULE_NOT_FOUND crash it would have replaced.
 *
 * An unmapped path THROWS and fails the build, because the alternative is shipping that
 * silent no-op. Interpolating ${CLAUDE_PLUGIN_ROOT} rather than emitting a plugin-relative
 * path keeps the resolved script absolute, so it survives getHookRoot()'s env fallback.
 */
function rebaseHookCommand(command, rewrite) {
  return command
    .split(' ')
    .map((token) => {
      if (!token.endsWith('.js')) return token;
      const mapped = rewrite.get(token);
      if (!mapped) {
        throw new Error(
          'build-mindforge-plugin: hook command references a script that is not bundled ' +
          `in the plugin: "${token}"\n  command: ${command}\n` +
          '  Add its source directory to HOOK_TREES — otherwise the plugin ships a hook ' +
          'that reports "Script not found" and exits 0 (a silent no-op).'
        );
      }
      return `"\${CLAUDE_PLUGIN_ROOT}/${mapped}"`;
    })
    .join(' ');
}

function buildHooks() {
  const rewrite = copyHookTrees();

  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.agent', 'settings.json'), 'utf8'));
  const out = {};
  for (const [event, groups] of Object.entries(settings.hooks || {})) {
    const claudeEvent = EVENT_MAP[event];
    if (!claudeEvent) continue; // skip events with no Claude equivalent
    out[claudeEvent] = groups.map((group) => ({
      ...(group.matcher ? { matcher: group.matcher } : {}),
      hooks: (group.hooks || []).map((h) => ({
        ...h,
        command: rebaseHookCommand(h.command, rewrite),
      })),
    }));
  }

  // NB: no MCP dependency-install hook. The MCP server ships as a single self-contained
  // esbuild bundle (all deps inlined), so there is nothing to install at runtime — the
  // server starts directly from ${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js. (The earlier
  // lazy-npm-install-into-${CLAUDE_PLUGIN_DATA} approach failed: Claude Code auto-starts
  // the stdio server at session start, before any install hook could provision deps.)

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
  // No existence guard here: the caller preflights MCP_ENTRY BEFORE the rmrf, because a guard
  // at this point could only fire after the rebuild had already deleted the committed mcp/dist.
  const mcpDistDst = path.join(PLUGIN, 'mcp', 'dist');
  ensure(mcpDistDst);

  // Bundle the single self-contained file (no vendor/, no node_modules, no package.json needed).
  fs.copyFileSync(MCP_ENTRY, path.join(mcpDistDst, 'index.js'));

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
}

/**
 * Recursively copy a directory (files + subdirs).
 *
 * This helper already existed here and was never called — the artifact of the bug it now
 * fixes. buildHooks() used a flat readdirSync().filter('.js') instead, which skipped
 * .agent/hooks/lib/ silently and shipped run-with-flags.js without the modules it require()s.
 */
function copyDirRecursive(src, dst) {
  ensure(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

/**
 * POSIX-style relative paths of every .js file under `dir`, recursively. Feeds the hook
 * rewrite map, so the map covers nested files (.agent/hooks/lib/*.js) and not just the top
 * level — a top-level-only map would let a nested hook path silently pass through unrebased.
 */
function listJsRecursive(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listJsRecursive(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.js')) out.push(rel);
  }
  return out;
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
// Preflight BEFORE the rmrf below. buildMcp() used to `return false` when the bundle was
// missing, print one "SKIPPED" line among five, and let the build exit 0 — but by then the
// rmrf had already deleted the committed mcp/dist/index.js and .mcp.json. The result was a
// "successful" regeneration that silently stripped the plugin's MCP server, and
// mcp-server/dist is untracked, so every fresh clone hit it. Refuse to build a partial plugin.
if (!fs.existsSync(MCP_ENTRY)) {
  console.error('build-mindforge-plugin: mcp-server/dist/index.js is missing.');
  console.error('  Build it first:  npm --prefix mcp-server run build');
  console.error('  Refusing to regenerate — doing so would delete the committed');
  console.error('  plugins/mindforge/mcp/dist/index.js and .mcp.json and still exit 0.');
  process.exit(1);
}

function build() {
  // Rebuild from scratch so deletions in source propagate (no stale files linger). These wipes were
  // at module scope, which is why the require.main guard alone was not enough: importing the module
  // deleted the whole plugin tree and then returned without rebuilding it. Measured — a bare
  // `require()` took plugins/ from 3 dirty files to 524.
  for (const sub of ['commands', 'agents', 'skills', 'hooks', 'scripts', 'mcp', '.claude-plugin']) {
    rmrf(path.join(PLUGIN, sub));
  }
  rmrf(path.join(PLUGIN, '.mcp.json'));

  buildMcp();
  const counts = {
    commands: buildCommands(),
    agents: buildAgents(),
    skills: buildSkills(),
    hookEvents: buildHooks(),
  };
  buildManifest(counts);

  console.log('Generated plugins/mindforge/:');
  console.log(`  commands: ${counts.commands}`);
  console.log(`  agents:   ${counts.agents}`);
  console.log(`  skills:   ${counts.skills} (incl. synthesized mindforge-protocol)`);
  console.log(`  hook events: ${counts.hookEvents}`);
  console.log('  mcp server: bundled (.mcp.json + mcp/dist)');
  return counts;
}

// Behind a require.main guard so importing this module does not REGENERATE 526 tracked files as an
// import side effect. It used to run at module scope, which made the generator unusable from a test:
// requiring it to read HOOK_TREES would rewrite the whole plugin tree mid-run. Same guard pattern as
// tests/run-all.js.
if (require.main === module) {
  build();
}

// Exported so tests can derive the source -> shipped mapping from the generator itself rather than
// re-declaring it. A test that hardcodes its own copy of this list stops testing the generator and
// starts testing its own duplicate — which is how the stale trust-gate-hook.js shipped unnoticed.
module.exports = { build, HOOK_TREES };
