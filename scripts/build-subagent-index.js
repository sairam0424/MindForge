#!/usr/bin/env node
/**
 * MindForge Subagent Index Builder — v1.0.0
 *
 * Walks subagents/categories/<NN-name>/*.md (excluding README.md), parses the
 * YAML frontmatter with a tiny line-based parser (no js-yaml dependency), and
 * emits .mindforge/imported-agents.jsonl — one compact JSON object per line,
 * sorted by name for deterministic output.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATEGORIES_DIR = path.join(ROOT, 'subagents', 'categories');
const OUTPUT_PATH = path.join(ROOT, '.mindforge', 'imported-agents.jsonl');
const FENCE = '---';
const DEFAULT_MODEL = 'sonnet';
const EXCLUDED_FILES = ['README.md'];

/**
 * Parse the YAML frontmatter block of a markdown file into a flat key/value
 * map. Reads only the lines between the first two `---` fences. Splits each
 * line on the first ': ' so that colons inside values are preserved. Strips a
 * single pair of surrounding quotes from values.
 */
function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== FENCE) {
    return null;
  }

  const fields = {};
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === FENCE) {
      return fields;
    }
    const separatorIndex = line.indexOf(': ');
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 2).trim();
    fields[key] = stripQuotes(rawValue);
  }

  return null; // No closing fence found.
}

/**
 * Remove a single matching pair of surrounding single or double quotes.
 */
function stripQuotes(value) {
  const isDoubleQuoted = value.startsWith('"') && value.endsWith('"');
  const isSingleQuoted = value.startsWith('\'') && value.endsWith('\'');
  if (value.length >= 2 && (isDoubleQuoted || isSingleQuoted)) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Build a single index entry from a markdown file's path. Throws with the
 * offending path if the frontmatter or required `name` field is missing.
 */
function buildEntry(absolutePath, category) {
  const content = fs.readFileSync(absolutePath, 'utf8');
  const frontmatter = parseFrontmatter(content);

  if (!frontmatter) {
    throw new Error(`Missing or malformed frontmatter: ${absolutePath}`);
  }
  if (!frontmatter.name) {
    throw new Error(`Missing frontmatter name: ${absolutePath}`);
  }

  const relativePath = path.relative(ROOT, absolutePath);
  return {
    name: frontmatter.name,
    path: relativePath,
    category,
    model: frontmatter.model || DEFAULT_MODEL,
    description: frontmatter.description || '',
  };
}

/**
 * Collect every indexable markdown file across all category directories.
 */
function collectAgentFiles() {
  const categories = fs
    .readdirSync(CATEGORIES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  const entries = [];
  for (const category of categories) {
    const categoryPath = path.join(CATEGORIES_DIR, category);
    const files = fs
      .readdirSync(categoryPath)
      .filter(file => file.endsWith('.md'))
      .filter(file => !EXCLUDED_FILES.includes(file));

    for (const file of files) {
      const absolutePath = path.join(categoryPath, file);
      entries.push(buildEntry(absolutePath, category));
    }
  }

  return entries;
}

function run() {
  if (!fs.existsSync(CATEGORIES_DIR)) {
    throw new Error(`Categories directory not found: ${CATEGORIES_DIR}`);
  }

  const entries = collectAgentFiles().sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const lines = entries.map(entry => JSON.stringify(entry));
  fs.writeFileSync(OUTPUT_PATH, `${lines.join('\n')}\n`, 'utf8');

  console.log(`✅ Indexed ${entries.length} subagents → ${path.relative(ROOT, OUTPUT_PATH)}`);
}

try {
  run();
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}
