/**
 * Guards the harness audit's LAYOUT assumptions — the reason it could not score an install.
 *
 * THE DEFECT. Five checks asked for the SOURCE-REPO layout by hardcoded path:
 *
 *     context-monitor-hook      .agent/hooks/mindforge-context-monitor.js
 *     memory-instinct-capture   bin/hooks/instinct-capture-hook.js
 *     security-trust-gate       bin/security/trust-gate-hook.js + trust-boundaries.js
 *     security-block-no-verify  .agent/hooks/mindforge-block-no-verify.js
 *     security-bash-guard-both  BOTH .claude/settings.json AND .agent/settings.json wired
 *
 * But the installer copies .agent/hooks/ to <localDir>/hooks/, and `bin/` is absent from a consumer
 * project entirely. So an installed tree failed checks whose subject it genuinely contained, and
 * security-bash-guard-both was unpassable on ANY install because nothing writes the .agent mirror —
 * whose BeforeTool/AfterTool events this repo's own spec records as never firing.
 *
 * That made the audit unusable as an install-root gate. It under-reported rather than over-reported,
 * which is the safer direction but still wrong: it measured LAYOUT, not enforcement.
 *
 * Measured, before and after, on a real confined install:
 *
 *     repo checkout        76/76  ->  76/76   (unchanged — a rubric fix must not inflate this)
 *     fresh --claude       36/76  ->  41/76   (+3 context-monitor, +2 block-no-verify)
 *
 * The +5 is exactly the two checks whose files the install already had. The remaining three still
 * fail, correctly: they need files no install currently copies, and a settings.json nothing writes.
 *
 * WHY THE REPO NUMBER IS THE IMPORTANT ASSERTION. Changing a rubric in the same breath as the thing
 * it measures is how a gate stops being evidence. Pinning repo == 76/76 across this change is what
 * makes the install-side movement attributable to the fix rather than to a loosened rubric.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const { buildReport } = require(path.join(REPO_ROOT, 'bin', 'harness-audit.js'));

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function withDir(fn) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-auditlayout-')));
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function touch(root, rel, body = '// probe\n') {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
}

function checkById(root, id) {
  const r = buildReport('repo', { rootDir: root });
  const c = r.checks.find((x) => x.id === id);
  assert.ok(c, `check ${id} not found — was it renamed?`);
  return c;
}

/** A real install into a throwaway project, HOME confined (installer-core.js:253 -> os.homedir()). */
function freshInstall() {
  const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-auditinst-')));
  const project = path.join(scratch, 'project');
  const home = path.join(scratch, 'home');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(project, 'package.json'),
    JSON.stringify({ name: 'probe', version: '1.0.0' }, null, 2));
  // ABSOLUTE installer path. A relative one resolves against the scratch cwd, silently installs
  // nothing, and the audit then reports 0/76 — which reads exactly like a catastrophic regression.
  const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'install.js'), '--claude', '--local'], {
    cwd: project, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home, CI: '1' },
  });
  assert.strictEqual(r.status, 0, `install failed: ${(r.stderr || '').slice(0, 300)}`);
  const fileCount = spawnSync('find', [project, '-type', 'f'], { encoding: 'utf8' })
    .stdout.split('\n').filter(Boolean).length;
  assert.ok(fileCount > 500,
    `the install produced only ${fileCount} files — the probe, not the product, is broken`);
  return { project, cleanup: () => fs.rmSync(scratch, { recursive: true, force: true }) };
}

// ── the anchor that made a correct registration read as unresolved ────────────

test('an env-anchored script path resolves instead of reading as absent', () => {
  withDir((root) => {
    touch(root, '.claude/hooks/run-with-flags.js');
    touch(root, '.claude/hooks/security/trust-gate-hook.js');
    fs.writeFileSync(path.join(root, '.claude/settings.json'), JSON.stringify({
      hooks: {
        PreToolUse: [{
          matcher: 'Bash',
          hooks: [{
            type: 'command',
            command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/run-with-flags.js" trust-gate '
              + '"$CLAUDE_PROJECT_DIR/.claude/hooks/security/trust-gate-hook.js" minimal,standard,strict',
          }],
        }],
      },
    }, null, 2));
    const c = checkById(root, 'security-bash-guard-both');
    assert.strictEqual(c.pass, true,
      'a $CLAUDE_PROJECT_DIR-anchored command whose scripts DO exist must count as wired. Claude ' +
      'Code has set CLAUDE_PROJECT_DIR in the hook environment since 1.0.57; checking the literal ' +
      'string "$CLAUDE_PROJECT_DIR/..." against the filesystem reports a working hook as permitting.');
  });
});

test('the anchor strip does not excuse a genuinely missing script', () => {
  // Non-vacuity: if stripping made every anchored path "resolve", the check would be a rubber stamp.
  withDir((root) => {
    touch(root, '.claude/hooks/run-with-flags.js');
    // trust-gate-hook.js deliberately NOT created
    fs.writeFileSync(path.join(root, '.claude/settings.json'), JSON.stringify({
      hooks: {
        PreToolUse: [{
          matcher: 'Bash',
          hooks: [{
            type: 'command',
            command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/run-with-flags.js" trust-gate '
              + '"$CLAUDE_PROJECT_DIR/.claude/hooks/security/trust-gate-hook.js" minimal,standard,strict',
          }],
        }],
      },
    }, null, 2));
    const c = checkById(root, 'security-bash-guard-both');
    assert.strictEqual(c.pass, false,
      'an anchored path to a file that does not exist must still FAIL — run-with-flags permits on a ' +
      'miss for advisory ids, so this is the difference between a gate and a decoration');
  });
});

// ── layout tolerance, in both directions ─────────────────────────────────────

const LAYOUT_CASES = [
  {
    id: 'context-monitor-hook',
    repo: ['.agent/hooks/mindforge-context-monitor.js'],
    installed: ['.claude/hooks/mindforge-context-monitor.js'],
  },
  {
    id: 'memory-instinct-capture',
    repo: ['bin/hooks/instinct-capture-hook.js'],
    installed: ['.claude/hooks/instinct/instinct-capture-hook.js'],
  },
  {
    id: 'security-block-no-verify',
    repo: ['.agent/hooks/mindforge-block-no-verify.js'],
    installed: ['.claude/hooks/mindforge-block-no-verify.js'],
  },
  {
    id: 'security-trust-gate',
    repo: ['bin/security/trust-gate-hook.js', 'bin/security/trust-boundaries.js'],
    installed: ['.claude/hooks/security/trust-gate-hook.js', '.claude/hooks/security/trust-boundaries.js'],
  },
];

for (const c of LAYOUT_CASES) {
  test(`${c.id} accepts the repo layout AND the installed layout, and fails on neither`, () => {
    withDir((root) => {
      assert.strictEqual(checkById(root, c.id).pass, false,
        `${c.id} must fail on an empty root — otherwise it is not measuring anything`);
    });
    withDir((root) => {
      c.repo.forEach((rel) => touch(root, rel));
      assert.strictEqual(checkById(root, c.id).pass, true, `${c.id} must pass on the repo layout`);
    });
    withDir((root) => {
      c.installed.forEach((rel) => touch(root, rel));
      assert.strictEqual(checkById(root, c.id).pass, true,
        `${c.id} must pass on the INSTALLED layout — this is the whole fix`);
    });
  });
}

test('security-trust-gate requires BOTH files, not one from each layout', () => {
  // A half-copied install must not satisfy this by mixing layouts.
  withDir((root) => {
    touch(root, 'bin/security/trust-gate-hook.js');
    touch(root, '.claude/hooks/security/trust-boundaries.js');
    assert.strictEqual(checkById(root, 'security-trust-gate').pass, false,
      'one file from each layout is a half-copied install, not a working guard');
  });
});

// ── the composite mirror gate ────────────────────────────────────────────────

test('the .agent mirror is required only when it exists', () => {
  const wiredClaude = {
    hooks: {
      PreToolUse: [{
        matcher: 'Bash',
        hooks: [{ type: 'command', command: 'node .claude/hooks/run-with-flags.js trust-gate .claude/hooks/security/trust-gate-hook.js minimal,standard,strict' }],
      }],
    },
  };
  // Absent mirror -> .claude alone decides.
  withDir((root) => {
    touch(root, '.claude/hooks/run-with-flags.js');
    touch(root, '.claude/hooks/security/trust-gate-hook.js');
    fs.writeFileSync(path.join(root, '.claude/settings.json'), JSON.stringify(wiredClaude, null, 2));
    assert.strictEqual(checkById(root, 'security-bash-guard-both').pass, true,
      'with no .agent/settings.json present, .claude being wired must be sufficient — requiring an ' +
      'unwritten mirror made this check unpassable on every install root');
  });
  // Present but UNWIRED mirror -> must fail. This is the assertion that stops the fix becoming a
  // blanket exemption for a half-configured Gemini setup.
  withDir((root) => {
    touch(root, '.claude/hooks/run-with-flags.js');
    touch(root, '.claude/hooks/security/trust-gate-hook.js');
    fs.writeFileSync(path.join(root, '.claude/settings.json'), JSON.stringify(wiredClaude, null, 2));
    fs.mkdirSync(path.join(root, '.agent'), { recursive: true });
    fs.writeFileSync(path.join(root, '.agent/settings.json'), JSON.stringify({ hooks: {} }, null, 2));
    assert.strictEqual(checkById(root, 'security-bash-guard-both').pass, false,
      'a PRESENT .agent/settings.json that does not wire trust-gate must still fail');
  });
});

// ── the numbers that make the change attributable ────────────────────────────

test('the repo score is UNCHANGED at 76/76 by this rubric fix', () => {
  // The load-bearing assertion. If a rubric change moves the maintainer number, the install-side
  // movement can no longer be attributed to the fix rather than to a loosened rubric.
  const r = buildReport('repo', { rootDir: REPO_ROOT });
  assert.strictEqual(r.overall_score, r.max_score,
    `the repo must still score a clean sweep, got ${r.overall_score}/${r.max_score}. A layout fix ` +
    'that raises the repo score is relaxing the rubric, not correcting it.');
  assert.strictEqual(r.max_score, 76, `max_score drifted to ${r.max_score}; update this test and the gate floor`);
});

test('a real install now scores 41/76, up from the 36 the old rubric reported', () => {
  const { project, cleanup } = freshInstall();
  try {
    const r = buildReport('repo', { rootDir: project });
    assert.strictEqual(r.overall_score, 41,
      `expected 41/76 after the layout fix, got ${r.overall_score}/${r.max_score}. The +5 is exactly ` +
      'context-monitor-hook (3) + security-block-no-verify (2) — the two checks whose files an ' +
      'install already contains. If this moved, either the installer changed what it copies or ' +
      'another check flipped, and the ratchet floor needs revisiting.');

    // The three that must STILL fail — they need files no install copies yet, and a settings.json
    // nothing writes. Asserting this stops the layout fix from being mistaken for enforcement.
    for (const id of ['memory-instinct-capture', 'security-trust-gate', 'security-bash-guard-both']) {
      assert.strictEqual(checkById(project, id).pass, false,
        `${id} must still fail on an install: this commit fixes the RUBRIC's layout assumption, not ` +
        'the missing files or the missing registration. If it passes now, enforcement landed ' +
        'somewhere and this test should be rewritten rather than relaxed.');
    }
  } finally { cleanup(); }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nHarness Audit Layout: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
