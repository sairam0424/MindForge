#!/usr/bin/env node
/**
 * MindForge — Claude Code plugin marketplace generator.
 *
 * Emits the repo-root `.claude-plugin/marketplace.json` that Claude Code resolves
 * for `/plugin marketplace add sairam0424/MindForge`. This is the SINGLE SOURCE OF
 * TRUTH for the marketplace catalog — never hand-edit the generated file; edit this
 * script and re-run `node scripts/build-plugin-marketplace.js`.
 *
 * Why a generator: the catalog must stay in lockstep with two upstream truths —
 * (1) the per-category subagent plugin.json files under subagents/categories/NN, and
 * (2) the comprehensive `mindforge` plugin under plugins/mindforge. A generator makes
 * source paths, owner schema, and version hoisting deterministic and re-runnable, so
 * a future refactor can't silently drift the catalog (the same discipline that the
 * imported-agents index and packaging-allowlist test enforce elsewhere).
 *
 * Schema authority: code.claude.com/docs/en/plugin-marketplaces#marketplace-schema
 *  - owner: { name (required), email (optional) }  — `url` is NOT a schema field
 *  - plugin source (relative): MUST start with "./" and resolve from the REPO ROOT
 *    (the dir containing .claude-plugin/), NOT from .claude-plugin/ itself.
 *  - top-level name/description/version are canonical (metadata.* is back-compat only)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATEGORIES_DIR = path.join(ROOT, 'subagents', 'categories');
const OUT_DIR = path.join(ROOT, '.claude-plugin');
const OUT_FILE = path.join(OUT_DIR, 'marketplace.json');

const OWNER = { name: 'MindForge Team', email: 'uggesairam0000@gmail.com' };

/** Read+parse a JSON file, or return null if absent. */
function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/**
 * Build one marketplace plugin entry for a subagent category. The `source` is made
 * relative to the REPO ROOT (where the generated marketplace.json's .claude-plugin/
 * lives), so the category plugin.json at subagents/categories/NN is reachable.
 */
function categoryEntry(dirName) {
  const pluginJson = readJson(
    path.join(CATEGORIES_DIR, dirName, '.claude-plugin', 'plugin.json')
  );
  if (!pluginJson) return null;
  return {
    name: pluginJson.name,
    source: `./subagents/categories/${dirName}`,
    description: pluginJson.description,
    version: pluginJson.version,
    category: pluginJson.category || 'agents',
    keywords: pluginJson.keywords || [],
  };
}

/** The comprehensive mindforge plugin entry (Phase 2). Included only if present. */
function mindforgeEntry() {
  const pluginJson = readJson(
    path.join(ROOT, 'plugins', 'mindforge', '.claude-plugin', 'plugin.json')
  );
  if (!pluginJson) return null;
  return {
    name: pluginJson.name,
    source: './plugins/mindforge',
    description: pluginJson.description,
    version: pluginJson.version,
    category: 'framework',
    keywords: pluginJson.keywords || [],
  };
}

function build() {
  const plugins = [];

  // The comprehensive plugin goes first so it's the headline install.
  const mf = mindforgeEntry();
  if (mf) plugins.push(mf);

  // Then the 10 à-la-carte subagent category packs, in numeric order.
  const categoryDirs = fs.existsSync(CATEGORIES_DIR)
    ? fs.readdirSync(CATEGORIES_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    : [];
  for (const dir of categoryDirs) {
    const entry = categoryEntry(dir);
    if (entry) plugins.push(entry);
  }

  const marketplace = {
    $schema: 'https://json.schemastore.org/claude-code-marketplace.json',
    name: 'mindforge',
    owner: OWNER,
    description:
      'MindForge — Sovereign Agentic Intelligence for Claude Code: the full framework plugin (commands, agents, skills, hooks) plus à-la-carte subagent packs.',
    plugins,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(marketplace, null, 2) + '\n', 'utf8');
  return { count: plugins.length, names: plugins.map((p) => p.name) };
}

const result = build();
console.log(`Wrote ${OUT_FILE}`);
console.log(`  ${result.count} plugin(s): ${result.names.join(', ')}`);
