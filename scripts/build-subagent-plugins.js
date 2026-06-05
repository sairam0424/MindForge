#!/usr/bin/env node
/**
 * MindForge — per-category subagent plugin.json generator.
 *
 * Regenerates `subagents/categories/NN/.claude-plugin/plugin.json` for each category,
 * deriving the `agents[]` list from the ACTUAL `.md` files on disk (README.md excluded).
 * This is the fix for the collision-rename drift: 16 agents were renamed `*-cc.md` on
 * import, but the hand-written `agents[]` arrays still listed the bare names, so
 * `claude plugin validate` reported them as path-not-found load failures.
 *
 * Deriving the list from disk makes the manifests self-healing — add/rename/remove an
 * agent file and re-run `node scripts/build-subagent-plugins.js`; the manifest follows.
 * Identity fields (name/description/version/category/keywords) are PRESERVED from the
 * existing manifest so curated metadata and per-plugin versions are not clobbered.
 *
 * Run after this: `node scripts/build-plugin-marketplace.js` (the catalog reads these).
 * Schema authority: code.claude.com/docs/en/plugins-reference#plugin-manifest-schema
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATEGORIES_DIR = path.join(ROOT, 'subagents', 'categories');
const OWNER = { name: 'MindForge Team', email: 'uggesairam0000@gmail.com' };
const REPOSITORY = 'https://github.com/sairam0424/MindForge';

function readJson(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}

/** Sorted list of agent .md basenames in a category dir, README excluded. */
function agentFiles(categoryDir) {
  return fs
    .readdirSync(categoryDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md')
    .map((e) => `./${e.name}`)
    .sort();
}

function build() {
  const summary = [];
  for (const dir of fs.readdirSync(CATEGORIES_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const categoryDir = path.join(CATEGORIES_DIR, dir.name);
    const manifestPath = path.join(categoryDir, '.claude-plugin', 'plugin.json');
    const prev = readJson(manifestPath);
    const agents = agentFiles(categoryDir);

    // Preserve curated identity/metadata; only the agents[] list is derived from disk.
    const manifest = {
      name: prev.name || `mindforge-${dir.name}`,
      version: prev.version || '1.0.0',
      description: prev.description || '',
      author: OWNER,
      repository: REPOSITORY,
      license: prev.license || 'MIT',
      ...(prev.category ? { category: prev.category } : {}),
      ...(prev.keywords ? { keywords: prev.keywords } : {}),
      agents,
    };

    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    summary.push(`${manifest.name}: ${agents.length} agents`);
  }
  return summary;
}

for (const line of build()) console.log(`  ${line}`);
console.log('Regenerated per-category plugin.json from on-disk agent files.');
