/**
 * MindForge - every tracked path must be a valid file name on Windows as well as macOS and Linux.
 *
 * THE DEFECT. 73 files under .agent/workflows/ were tracked with a colon in the name
 * (mindforge:help.md, forge:init-project.md, ...). The colon is the Antigravity installer's
 * namespace prefix (bin/installer-core.js, resolveCommandTarget), and the files were a snapshot of
 * an install into this very checkout that got committed and then orphaned: the folder ships zero
 * files in the npm package and nothing reads it. A colon is not a legal file name character on
 * Windows, so `git clone` of this repository could not create those paths there, and Anthropic's
 * plugin directory lists "valid on both Windows and macOS: no colon, no trailing dot or space, no
 * Windows device name, no two names that differ only by capitalization" as a check that stops
 * repository validation outright.
 *
 * Nothing caught it in five months because the only consumers were macOS and Linux. This checks the
 * whole tracked tree with the directory's own rules, and that .gitignore keeps a future Antigravity
 * install into this checkout from being committable again.
 *
 * Run: node tests/tracked-paths-portable.test.js
 */
'use strict';

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const FORBIDDEN_CHARS = new Set(['<', '>', ':', '"', '|', '?', '*', '\\']);
const RESERVED_DEVICE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

function problemWithComponent(part) {
  for (const ch of part) {
    if (FORBIDDEN_CHARS.has(ch))
      return `contains "${ch}", which Windows does not allow in a file name`;
    if (ch.charCodeAt(0) < 32) return 'contains a control character';
  }
  if (/[. ]$/.test(part))
    return 'ends with a dot or a space, which Windows strips';
  if (RESERVED_DEVICE_NAME.test(part))
    return 'is a reserved Windows device name';
  return null;
}

function findUnportablePaths(paths) {
  const problems = [];
  const byLowerCase = new Map();
  for (const p of paths) {
    for (const part of p.split('/')) {
      const reason = problemWithComponent(part);
      if (reason) {
        problems.push({ path: p, reason: `"${part}" ${reason}` });
        break;
      }
    }
    const key = p.toLowerCase();
    if (byLowerCase.has(key) && byLowerCase.get(key) !== p) {
      problems.push({
        path: p,
        reason: `differs only by capitalization from ${byLowerCase.get(key)}`,
      });
    } else {
      byLowerCase.set(key, p);
    }
  }
  return problems;
}

function trackedPaths() {
  const out = execFileSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return out.split('\0').filter(Boolean);
}

test('every tracked path is a valid file name on Windows and macOS', () => {
  const paths = trackedPaths();
  assert.ok(
    paths.length > 1000,
    `expected the whole tracked tree, got ${paths.length} paths - is this a git checkout?`,
  );
  const problems = findUnportablePaths(paths);
  const shown = problems
    .slice(0, 10)
    .map((p) => `  ${p.path}: ${p.reason}`)
    .join('\n');
  assert.deepStrictEqual(
    problems,
    [],
    `${problems.length} tracked path(s) cannot be checked out on Windows:\n${shown}${problems.length > 10 ? '\n  ...' : ''}`,
  );
});

test('the checker flags each kind of unportable name', () => {
  const bad = {
    'a/mindforge:help.md': 'colon',
    'a/what?.md': 'question mark',
    'a/star*.md': 'asterisk',
    'a/pipe|x.md': 'pipe',
    'a/quote".md': 'double quote',
    'a/angle<x>.md': 'angle brackets',
    'a/back\\slash.md': 'backslash',
    'a/trailing.': 'trailing dot',
    'a/trailing ': 'trailing space',
    'src/CON.js': 'reserved device name with extension',
    'aux/readme.md': 'reserved device name as a directory',
    'x/lpt1': 'reserved device name LPT1',
    'a/bell\u0007.md': 'control character',
  };
  for (const [p, what] of Object.entries(bad)) {
    assert.strictEqual(
      findUnportablePaths([p]).length,
      1,
      `should flag ${what}: ${JSON.stringify(p)}`,
    );
  }
  const collision = findUnportablePaths(['docs/Readme.md', 'docs/README.md']);
  assert.strictEqual(
    collision.length,
    1,
    'should flag two paths that differ only by capitalization',
  );
  assert.match(collision[0].reason, /capitalization/);
});

test('the checker accepts ordinary names, including spaces, dots and dashes inside a name', () => {
  const good = [
    'README.md',
    '.github/workflows/ci.yml',
    'docs/a b/c.md',
    'a/b-c_d.e.f.md',
    'src/console.js',
    'src/auxiliary.js',
    'tests/com10.test.js',
    '.agent/workflows/mindforge-plan-phase.md',
  ];
  assert.deepStrictEqual(findUnportablePaths(good), []);
});

test('an Antigravity install into this checkout cannot be committed (colon workflow files are ignored)', () => {
  for (const sample of [
    '.agent/workflows/mindforge:help.md',
    '.agent/workflows/forge:init-project.md',
  ]) {
    let ignored = true;
    try {
      execFileSync('git', ['check-ignore', '-q', '--', sample], {
        cwd: ROOT,
        stdio: 'ignore',
      });
    } catch {
      ignored = false;
    }
    assert.ok(
      ignored,
      `${sample} is not git-ignored - add ".agent/workflows/*:*" to .gitignore`,
    );
  }
});

(async () => {
  let passed = 0,
    failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅  ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌  ${name}\n      ${e.message}`);
      failed++;
    }
  }
  console.log(`\nTracked Paths Portable: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
