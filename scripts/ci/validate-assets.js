#!/usr/bin/env node
'use strict';

/**
 * MindForge — repo-wide asset validation chain.
 *
 * Adapted from ECC's scripts/ci/validate-*.js + check-unicode-safety.js, but
 * SCOPED PER-ROOT for MindForge's three heterogeneous frontmatter shapes:
 *   - .mindforge/skills SKILL.md   -> STRICT engine schema (name, version, status)
 *   - .agent/skills SKILL.md       -> LENIENT (name + a body)
 *   - subagents/categories md      -> LENIENT (name + description)
 *   - .claude/commands + .agent/mindforge md -> command (description)
 *
 * Plus a BLOCKING dangerous-invisible-unicode scan across all asset markdown
 * (ASCII/tag smuggling, zero-width, bidi overrides — the supply-chain injection
 * vector). Emoji are allowed in MindForge docs, so emoji are NOT flagged
 * (unlike ECC's check) — only genuinely dangerous invisibles block.
 *
 * Prepended to the test run via `npm run validate:assets`. Exits 1 on any
 * blocking violation, 0 otherwise.
 *
 * CRITICAL per the plan: scope per-root or the strict validator red-flags the
 * entire .agent corpus and breaks the build.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// ── dangerous invisible unicode (security: ASCII/tag smuggling) ───────────────
function isDangerousInvisible(cp) {
  return (
    (cp >= 0x200B && cp <= 0x200D) || cp === 0x2060 || cp === 0xFEFF ||
    (cp >= 0x202A && cp <= 0x202E) || (cp >= 0x2066 && cp <= 0x2069) ||
    (cp >= 0xE0000 && cp <= 0xE007F) ||  // Unicode Tag block — the smuggling vector
    cp === 0x180E || cp === 0x115F || cp === 0x1160 ||
    (cp >= 0x2061 && cp <= 0x2064) || cp === 0x3164
  );
}

function scanInvisible(text) {
  const hits = [];
  let idx = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (isDangerousInvisible(cp)) {
      const line = text.slice(0, idx).split('\n').length;
      hits.push({ codePoint: `U+${cp.toString(16).toUpperCase()}`, line });
    }
    idx += ch.length;
  }
  return hits;
}

// ── frontmatter parsing (line-based, no js-yaml) ──────────────────────────────
function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') return null;
  const fields = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return fields;
    const sep = lines[i].indexOf(':');
    if (sep === -1) continue;
    const key = lines[i].slice(0, sep).trim();
    let val = lines[i].slice(sep + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
      val = val.slice(1, -1);
    }
    if (key) fields[key] = val;
  }
  return null; // no closing fence
}

function walk(dir, filter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, filter));
    else if (filter(entry.name)) out.push(full);
  }
  return out;
}

const violations = [];
function fail(file, msg) { violations.push(`${path.relative(ROOT, file)}: ${msg}`); }

// ── 1. STRICT: .mindforge/skills engine schema ────────────────────────────────
for (const file of walk(path.join(ROOT, '.mindforge', 'skills'), n => n === 'SKILL.md')) {
  const content = fs.readFileSync(file, 'utf8');
  const fm = parseFrontmatter(content);
  if (!fm) { fail(file, 'missing/malformed frontmatter (strict engine skill)'); continue; }
  for (const req of ['name', 'version', 'status']) {
    if (!fm[req]) fail(file, `missing required engine field "${req}"`);
  }
}

// ── 2. LENIENT: .agent/skills (name + body only) ──────────────────────────────
for (const file of walk(path.join(ROOT, '.agent', 'skills'), n => n === 'SKILL.md')) {
  const content = fs.readFileSync(file, 'utf8');
  const fm = parseFrontmatter(content);
  if (!fm) { fail(file, 'missing/malformed frontmatter (.agent skill)'); continue; }
  if (!fm.name) fail(file, 'missing "name"');
}

// ── 3. LENIENT: subagents (name + description) ────────────────────────────────
for (const file of walk(path.join(ROOT, 'subagents', 'categories'), n => n.endsWith('.md') && n !== 'README.md')) {
  const content = fs.readFileSync(file, 'utf8');
  const fm = parseFrontmatter(content);
  if (!fm) { fail(file, 'missing/malformed frontmatter (subagent)'); continue; }
  if (!fm.name) fail(file, 'missing "name"');
  if (!fm.description) fail(file, 'missing "description"');
}

// ── 4. commands: description frontmatter ──────────────────────────────────────
for (const dir of [path.join(ROOT, '.claude', 'commands', 'mindforge'), path.join(ROOT, '.agent', 'mindforge')]) {
  for (const file of walk(dir, n => n.endsWith('.md'))) {
    const content = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) { fail(file, 'missing/malformed frontmatter (command)'); continue; }
    if (!fm.description) fail(file, 'missing "description"');
  }
}

// ── 5. BLOCKING: dangerous-invisible unicode across all asset markdown ────────
const unicodeRoots = [
  path.join(ROOT, '.mindforge', 'skills'),
  path.join(ROOT, '.agent', 'skills'),
  path.join(ROOT, '.agent', 'mindforge'),
  path.join(ROOT, '.claude', 'commands', 'mindforge'),
  path.join(ROOT, 'subagents', 'categories'),
  path.join(ROOT, '.mindforge', 'rules'),
];
for (const root of unicodeRoots) {
  for (const file of walk(root, n => n.endsWith('.md'))) {
    const hits = scanInvisible(fs.readFileSync(file, 'utf8'));
    for (const h of hits) fail(file, `dangerous invisible unicode ${h.codePoint} at line ${h.line} (ASCII smuggling vector)`);
  }
}

// ── report ────────────────────────────────────────────────────────────────────
if (violations.length > 0) {
  console.error(`\nAsset validation FAILED — ${violations.length} violation(s):`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log('Asset validation passed (per-root frontmatter + dangerous-unicode scan).');
process.exit(0);
