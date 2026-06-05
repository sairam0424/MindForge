#!/usr/bin/env node
/**
 * MindForge — component frontmatter YAML fixer.
 *
 * `claude plugin validate` surfaced that many command/agent/skill files have a
 * `description:` value that is not valid YAML scalar text: a leading `- `, an
 * embedded `: ` (e.g. "Triggers on: '...'"), a leading `@`, or a trailing `:` all
 * make YAML mis-parse the value (as a sequence, a mapping, etc.), so the frontmatter
 * silently loads empty. The glob-based npx installer never validated these; a
 * plugin's loader does, and an empty description means the component is undiscoverable.
 *
 * Fix: rewrite each `description:` (and `name:`) frontmatter value as a double-quoted
 * YAML scalar with embedded quotes/backslashes escaped. Idempotent — a value that is
 * already a clean double-quoted scalar, or a YAML block scalar (`>-`/`|`), is left
 * untouched. Operates on the CANONICAL sources so the installer and the generated
 * plugin both inherit the fix. Re-run: node scripts/fix-command-frontmatter.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Canonical source trees whose markdown frontmatter feeds the plugin + installer.
const TARGETS = [
  { dir: path.join(ROOT, '.claude', 'commands', 'mindforge'), recursive: false },
  { dir: path.join(ROOT, 'subagents', 'categories'), recursive: true },
  { dir: path.join(ROOT, '.agent', 'skills'), recursive: true, file: 'SKILL.md' },
];

// Frontmatter scalar fields that must be valid single-line YAML strings.
const FIELDS = ['name', 'description'];

function isAlreadySafe(value) {
  // Block scalars are valid YAML — leave them.
  if (value.startsWith('>') || value.startsWith('|')) return true;
  if (!(value.startsWith('"') && value.endsWith('"') && value.length >= 2)) return false;
  const inner = value.slice(1, -1);
  return !/(?<!\\)"/.test(inner); // no unescaped interior double-quote
}

function quote(raw) {
  return '"' + raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/** Quote unsafe FIELDS in the leading frontmatter block. Returns true if changed. */
function fixFile(full) {
  const text = fs.readFileSync(full, 'utf8');
  const fm = text.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
  if (!fm) return false;
  const [, open, body, close] = fm;
  let changed = false;
  const newBody = body.split('\n').map((line) => {
    for (const field of FIELDS) {
      const m = line.match(new RegExp(`^${field}:\\s*(.*)$`));
      if (!m) continue;
      const value = m[1].trim();
      if (value === '' || isAlreadySafe(value)) return line;
      changed = true;
      return `${field}: ${quote(value)}`;
    }
    return line;
  }).join('\n');
  if (!changed) return false;
  fs.writeFileSync(full, open + newBody + close + text.slice(fm[0].length), 'utf8');
  return true;
}

/** Collect target .md files for one target spec. */
function collect(target) {
  const out = [];
  if (!fs.existsSync(target.dir)) return out;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (target.recursive) walk(full); continue; }
      if (target.file) { if (e.name === target.file) out.push(full); }
      else if (e.name.endsWith('.md') && e.name !== 'README.md') out.push(full);
    }
  };
  walk(target.dir);
  return out;
}

let total = 0;
for (const target of TARGETS) {
  let n = 0;
  for (const file of collect(target)) { if (fixFile(file)) n++; }
  console.log(`  ${path.relative(ROOT, target.dir)}: quoted ${n} file(s)`);
  total += n;
}
console.log(`Quoted frontmatter in ${total} file(s) total.`);
