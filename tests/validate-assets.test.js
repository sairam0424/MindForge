'use strict';

/**
 * Negative-path tests for the dangerous-invisible-unicode scan in
 * scripts/ci/validate-assets.js.
 *
 * The repo-wide validator runs on every `npm test` (via validate:assets), but
 * that only proves the EXISTING corpus is clean — the happy path. These tests
 * prove the scan actively CATCHES an injected threat (the supply-chain vector
 * the scan exists to defend against: ASCII/tag smuggling, zero-width, bidi
 * overrides). Without them the control could silently rot and still report pass.
 *
 * We exercise the real detection logic the script uses (isDangerousInvisible /
 * scanInvisible, exported when the script is require()d) — not a reimplementation
 * — and also drive the script end-to-end against a crafted persona fixture to
 * confirm a planted zero-width space makes it exit non-zero.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'ci', 'validate-assets.js');
const validator = require(SCRIPT);

// ── unit: the detection predicate ─────────────────────────────────────────────

test('isDangerousInvisible flags the documented smuggling code points', () => {
  const dangerous = [
    0x200B, 0x200C, 0x200D, // zero-width space/non-joiner/joiner
    0x2060,                 // word joiner
    0xFEFF,                 // BOM / zero-width no-break
    0x202A, 0x202E,         // bidi embedding/override
    0x2066, 0x2069,         // bidi isolates
    0xE0041, 0xE007F,       // Unicode Tag block — the ASCII-smuggling vector
    0x180E, 0x115F, 0x1160, 0x3164,
  ];
  for (const cp of dangerous) {
    assert.strictEqual(validator.isDangerousInvisible(cp), true,
      `U+${cp.toString(16).toUpperCase()} must be flagged`);
  }
});

test('isDangerousInvisible does NOT flag ordinary characters or emoji', () => {
  for (const cp of [0x41 /* A */, 0x20 /* space */, 0x0A /* newline */, 0x1F600 /* emoji */, 0x4E2D /* CJK */]) {
    assert.strictEqual(validator.isDangerousInvisible(cp), false,
      `U+${cp.toString(16).toUpperCase()} must NOT be flagged`);
  }
});

test('scanInvisible reports clean text as having zero hits', () => {
  assert.strictEqual(validator.scanInvisible('# Title\nplain ascii body, emoji ok 🙂\n').length, 0);
});

test('scanInvisible catches an injected zero-width space and reports its line', () => {
  const text = 'line one\nbad​word\nline three';
  const hits = validator.scanInvisible(text);
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].codePoint, 'U+200B');
  assert.strictEqual(hits[0].line, 2, 'violation reported on the correct line');
});

test('scanInvisible catches a Unicode Tag-block smuggling sequence', () => {
  // Hidden "A" smuggled via the tag block — invisible to a human reviewer.
  const hits = validator.scanInvisible('visible text\u{E0041}\u{E0042}');
  assert.ok(hits.length >= 1, 'tag-block code points must be flagged');
});

// ── end-to-end: the script exits non-zero on a poisoned asset ─────────────────
// We can't poison the real tree, so we run the script with ROOT pointed at a
// fixture via a thin wrapper that requires the script after chdir. Simplest
// robust approach: copy the script into a temp tree whose .mindforge/personas
// holds a poisoned file, and run it there so its ROOT (../../ from scripts/ci)
// resolves to the fixture.

test('validate-assets.js exits non-zero when a persona contains invisible unicode', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-validate-'));
  try {
    // Recreate the minimal tree the script walks: scripts/ci/ + .mindforge/personas.
    fs.mkdirSync(path.join(tmp, 'scripts', 'ci'), { recursive: true });
    fs.mkdirSync(path.join(tmp, '.mindforge', 'personas'), { recursive: true });
    fs.copyFileSync(SCRIPT, path.join(tmp, 'scripts', 'ci', 'validate-assets.js'));
    // A persona that looks innocent but smuggles a zero-width space.
    fs.writeFileSync(path.join(tmp, '.mindforge', 'personas', 'evil.md'),
      '---\nname: evil\n---\nLooks fine but hides a​zero-width space.\n');

    let code = 0;
    let out = '';
    try {
      out = execFileSync('node', [path.join(tmp, 'scripts', 'ci', 'validate-assets.js')],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      code = err.status;
      out = (err.stdout || '') + (err.stderr || '');
    }
    assert.strictEqual(code, 1, 'poisoned persona must fail the scan');
    assert.match(out, /invisible unicode|U\+200B/i, 'failure must name the unicode violation');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

console.log('validate-assets negative-path tests defined');
