#!/usr/bin/env node
'use strict';

/**
 * MindForge — One-time CHANGELOG.md → changelogs/ migration script.
 *
 * Splits the monolithic CHANGELOG.md (98 version entries, v0.1.0 -> v11.9.0)
 * into one file per version under changelogs/vX.Y.Z.md, verbatim.
 *
 * Root CHANGELOG.md is left untouched by this script — it is hand-rewritten
 * afterward into a rolling-window aggregator (newest ~10 versions) per the
 * migration plan. This script's job is ONLY the full-archive split + verify.
 *
 * Usage:
 *   node scripts/migrate-changelog.js            # split + write changelogs/*.md
 *   node scripts/migrate-changelog.js --verify   # re-check existing files match source slices
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');
const CHANGELOGS_DIR = path.join(ROOT, 'changelogs');
const PREAMBLE = '# Changelog\n\n';

// Same version-boundary pattern bin/updater/changelog-fetcher.js's extractEntries()
// uses (`^## \[?v?(\d+\.\d+\.\d+)`), extended to also capture pre-release suffixes
// (-alpha, -alpha.2, ...) so that e.g. "6.2.0" and "6.2.0-alpha" split into distinct
// files instead of colliding.
const HEADER_RE = /^## \[?v?(\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?)\]?/;

// A bare "## Something" heading that ISN'T a version header ends the current
// section too — root CHANGELOG.md's rolling window closes with a non-version
// "## Older releases" footer, which must not be captured as part of the last
// version's own body.
const NON_VERSION_H2_RE = /^## (?!\[?v?\d+\.\d+\.\d+)/;

function splitSections(raw) {
  const lines = raw.split('\n');
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADER_RE);
    if (m) {
      if (current) sections.push(current);
      current = { version: m[1], startLine: i + 1, lines: [lines[i]] };
    } else if (NON_VERSION_H2_RE.test(lines[i])) {
      if (current) sections.push(current);
      current = null;
    } else if (current) {
      current.lines.push(lines[i]);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function main() {
  const verifyOnly = process.argv.includes('--verify');
  const raw = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const sections = splitSections(raw);

  console.log(`Found ${sections.length} version sections in CHANGELOG.md`);

  const seen = new Map();
  for (const s of sections) {
    if (seen.has(s.version)) {
      console.error(`Duplicate version detected: ${s.version} (lines ${seen.get(s.version)} and ${s.startLine})`);
      process.exit(1);
    }
    seen.set(s.version, s.startLine);
  }

  if (!verifyOnly) {
    fs.mkdirSync(CHANGELOGS_DIR, { recursive: true });
  }

  let ok = 0;
  const problems = [];

  for (const s of sections) {
    const sliceRaw = s.lines.join('\n'); // exact verbatim slice of CHANGELOG.md
    const filePath = path.join(CHANGELOGS_DIR, `v${s.version}.md`);

    if (verifyOnly) {
      if (!fs.existsSync(filePath)) {
        problems.push(`MISSING: changelogs/v${s.version}.md`);
        continue;
      }
      const existing = fs.readFileSync(filePath, 'utf8');
      if (!existing.startsWith(PREAMBLE)) {
        problems.push(`BAD PREAMBLE: changelogs/v${s.version}.md`);
        continue;
      }
      const body = existing.slice(PREAMBLE.length).replace(/\n$/, '');
      if (body !== sliceRaw) {
        problems.push(`MISMATCH: changelogs/v${s.version}.md does not match its CHANGELOG.md slice`);
        continue;
      }
      ok++;
    } else {
      fs.writeFileSync(filePath, `${PREAMBLE}${sliceRaw}\n`, 'utf8');
      ok++;
    }
  }

  const verb = verifyOnly ? 'Verified' : 'Wrote';
  console.log(`${verb} ${ok}/${sections.length} files`);
  if (problems.length) {
    problems.forEach(p => console.error(p));
    process.exit(1);
  }
  if (ok !== sections.length) process.exit(1);
}

main();
