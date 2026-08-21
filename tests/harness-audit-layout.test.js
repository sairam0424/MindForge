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
 * The +5 is exactly the two checks whose files the install already had.
 *
 * REG-01 subsequently landed installer-side hook registration, so a real install now scores 49/76.
 * The tests below therefore call hook-registration.unregister() to isolate the two effects: 41 is
 * what the LAYOUT fix bought, 49 is what ENFORCEMENT bought on top of it. Asserting both, in both
 * directions, is what keeps each commit's delta attributable to that commit.
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

test('the layout fix alone accounts for 36 -> 41, separated from registration', () => {
  // A real install NOW also registers hooks (REG-01), so "what does an install score" conflates two
  // independent changes. Unregistering isolates the rubric fix: strip REG-01's own entries and the
  // remaining number is purely what the layout correction bought.
  const reg = require(path.join(REPO_ROOT, 'bin', 'installer', 'hook-registration.js'));
  const { project, cleanup } = freshInstall();
  try {
    const withReg = buildReport('repo', { rootDir: project }).overall_score;
    reg.unregister(project);
    const withoutReg = buildReport('repo', { rootDir: project }).overall_score;

      // 43, not 41, since coreFiles began carrying the six routed top-level bin/ scripts whose absence
      // killed 11 of 27 verbs. Exactly ONE audit check flipped as a result — quality-skill-validator,
      // worth 2 — because bin/skill-validator.js is now installed. Established by diffing the per-check
      // results with and without that change, rather than adjusting the number until it matched: a score
      // expectation edited without knowing which check moved is no longer an expectation.
    assert.strictEqual(withoutReg, 43,
      `un-registered install must score 43/76 — layout fix plus routed-script install. Got ${withoutReg}. The +5 over ` +
      'the old rubric\'s 36 is exactly context-monitor-hook (3) + security-block-no-verify (2), the ' +
      'two checks whose files an install already contained.');

    assert.ok(withReg > withoutReg,
      `registration must add score on top of the layout fix: got ${withReg} registered vs ` +
      `${withoutReg} un-registered. If equal, REG-01 registered nothing.`);
      // 51, not 49: the same +2 from quality-skill-validator rides along on the registered score.
    assert.strictEqual(withReg, 51,
      `registered install must score 51/76, got ${withReg}. That +8 is enforcement, not rubric — if it ` +
      'moved, raise INSTALL_SCORE_FLOOR in scripts/ci/harness-gate-install.js to match.');
  } finally { cleanup(); }
});

test('the three settings-dependent checks fail WITHOUT registration and pass WITH it', () => {
  // Before REG-01 these three failed on every install. Asserting both directions is what keeps the
  // layout fix and the enforcement fix attributable to their own commits.
  const reg = require(path.join(REPO_ROOT, 'bin', 'installer', 'hook-registration.js'));
  const ids = ['memory-instinct-capture', 'security-trust-gate', 'security-bash-guard-both'];
  const { project, cleanup } = freshInstall();
  try {
    for (const id of ids) {
      assert.strictEqual(checkById(project, id).pass, true,
        `${id} must PASS on a registered install — REG-01 copies the files and writes the settings`);
    }
    reg.unregister(project);
    for (const id of ids) {
      assert.strictEqual(checkById(project, id).pass, false,
        `${id} must FAIL once registration is removed. If it still passes, it is not actually ` +
        'measuring registration and cannot distinguish a wired install from an unwired one.');
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
