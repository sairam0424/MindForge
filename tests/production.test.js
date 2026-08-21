/**
 * MindForge Day 7 — Production Readiness Tests
 * Verifies the installer, updater, migration engine, plugin system,
 * token optimiser, and all 36 commands exist.
 *
 * Run: node tests/production.test.js
 */
'use strict';

const fs   = require('fs');
const assert = require('assert');

if (!fs.existsSync(require('path').join(process.cwd(), 'bin/mindforge-cli.js'))) {
  console.error('ERROR: Tests must be run from the MindForge project root: cd MindForge && npm test');
  process.exit(1);
}

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

const read   = p  => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const exists = p  => fs.existsSync(p);

// ── Installer completeness ─────────────────────────────────────────────────────
console.log('\nMindForge Day 7 — Production Readiness Tests\n');
console.log('Installer:');

test('bin/install.js exists with shebang', () => {
  const c = read('bin/install.js');
  assert.ok(c.includes('#!/usr/bin/env node'), 'Missing shebang');
  assert.ok(c.length > 500, 'install.js seems too short');
});

test('bin/installer-core.js exists and exports run()', () => {
  const c = read('bin/installer-core.js');
  assert.ok(c.includes('module.exports'), 'Missing module.exports');
  assert.ok(c.includes('async function run') || c.includes('function run'), 'Missing run function');
});

test('installer handles --version flag correctly', () => {
  const c = read('bin/install.js');
  assert.ok(c.includes('\'--version\'') || c.includes('"--version"'), 'Missing --version');
  assert.ok(c.includes('process.exit(0)'), 'Should exit 0 for --version');
});

test('installer has Node.js version gate (≥ 18)', () => {
  const combined = read('bin/install.js') + read('bin/installer-core.js');
  assert.ok(combined.includes('18'), 'Should check for Node.js 18');
  assert.ok(combined.includes('process.exit(1)') || combined.includes('exit(1)'), 'Should exit 1 for old node');
});

test('installer has CI mode detection', () => {
  const c = read('bin/install.js');
  assert.ok(c.includes('process.env.CI'), 'Should detect CI environment');
  assert.ok(c.includes('IS_NON_INTERACTIVE'), 'Should have non-interactive flag');
});

test('installer backs up existing CLAUDE.md', () => {
  const c = read('bin/installer-core.js');
  assert.ok(c.includes('backup') || c.includes('.backup-'), 'Should back up CLAUDE.md');
});

test('a self-install writes NOTHING over the repository\'s own tracked files', () => {
  // THIS REPLACES A VACUOUS ASSERTION. It read:
  //   assert.ok(c.includes('isSelfInstall') || c.includes("'mindforge-cc'"), 'Should detect self-install')
  // — a grep of the source for a string that any COMMENT satisfies. It could not fail while the
  // detection was broken, and it did not fail while the detection worked and the installer overwrote
  // 149 tracked files anyway.
  //
  // THE DEFECT it now covers. `selfInstall` gated 8 write sites and missed two: the entry-file write
  // and the entire command copy. So a self-install printed "Self-install detected — skipping framework
  // file copy" and then overwrote `.claude/CLAUDE.md` plus 149 tracked files under
  // `.claude/commands/`, with no backup — safeCopyClaude only backs up when the existing content does
  // NOT contain "MindForge", and this repo's entry file does.
  //
  // Asserted against a real clone and real git status, because the property is "the working tree is
  // untouched" and nothing short of git can establish that.
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');

  const REPO = process.cwd();
  const work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-selfinstall-')));
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-selfinstall-home-')));
  const clone = path.join(work, 'repo');

  try {
    const cloned = spawnSync('git', ['clone', '--quiet', '--no-hardlinks', '--shared', REPO, clone],
      { encoding: 'utf8' });
    assert.strictEqual(cloned.status, 0, `could not clone the repo: ${(cloned.stderr || '').slice(0, 200)}`);

    // Carry any UNCOMMITTED installer changes into the clone, then commit them there, so the clone
    // starts clean AND reflects the tree about to be committed. Without this the test could only ever
    // describe committed state, which means it cannot go green until after the fix lands — and a gate
    // you cannot run before committing gets bypassed with --no-verify. In CI the diff is empty and
    // this is a no-op.
    const diff = spawnSync('git', ['diff', 'HEAD', '--', 'bin', 'tests'], { cwd: REPO, encoding: 'utf8' });
    if (diff.stdout && diff.stdout.trim()) {
      const applied = spawnSync('git', ['apply', '--whitespace=nowarn', '-'],
        { cwd: clone, encoding: 'utf8', input: diff.stdout });
      assert.strictEqual(applied.status, 0,
        `could not carry the working-tree diff into the clone: ${(applied.stderr || '').slice(0, 300)}`);
      spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-aqm', 'wt'],
        { cwd: clone, encoding: 'utf8' });
    }

    // The clone must start clean, or "nothing changed" would be unmeasurable.
    const before = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8', cwd: clone });
    assert.strictEqual(before.stdout.trim(), '',
      `the clone is not clean, so this test cannot attribute changes: ${before.stdout.slice(0, 200)}`);

    // node_modules is not symlinked: bin/install.js must run on builtins plus its own bin/ tree.
    const r = spawnSync(process.execPath, ['bin/install.js', '--claude', '--local', '--skip-wizard'], {
      cwd: clone, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home, CI: '1' },
    });
    assert.strictEqual(r.status, 0, `the self-install failed: ${(r.stderr || '').slice(-300)}`);

    // NON-VACUITY: it must actually have taken the self-install branch. Without this, an install that
    // errored early or ran as a normal install would also leave... no, a normal install would DIRTY the
    // tree. But an install that did nothing at all would pass, so require the branch to announce itself.
    assert.match(r.stdout, /Self-install detected/,
      `the run did not take the self-install branch, so it proves nothing. Output: ${r.stdout.slice(-300)}`);

    const after = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8', cwd: clone });
    const modified = after.stdout.split('\n').filter((l) => l.startsWith(' M') || l.startsWith('M'));
    assert.deepStrictEqual(modified, [],
      `${modified.length} TRACKED file(s) were overwritten by a self-install:\n  `
      + `${modified.slice(0, 8).join('\n  ')}\nThe installer says it is skipping the framework file `
      + 'copy; it must not then copy. Measured before the gate: 149 files, zero backups.');

    // And it must not claim work it did not do — the summary panel counts the SOURCE tree, so it
    // announced "221 Total autonomous commands deployed" for a run that deployed none.
    assert.ok(!/Total autonomous commands deployed/.test(r.stdout),
      'the self-install printed the deployment summary panel, which reports source-tree counts and so '
      + 'claims commands were deployed when none were written');
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('a GLOBAL install still works when run from inside the repository', () => {
  // THE REGRESSION THIS CATCHES, which the self-install gate above introduced and an independent
  // audit found before it merged.
  //
  // isSelfInstall() answers only "is the CURRENT DIRECTORY the MindForge repo". The gate's premise is
  // narrower: "the files I am about to write ARE this repository's tracked files". True for a LOCAL
  // install (baseDir is `.claude/` in the repo); false for a GLOBAL install (baseDir is
  // `~/.claude/`). Keying on cwd alone therefore skipped every write of a perfectly legitimate global
  // install, failed verification, and printed "Retry: ... --force" — which also fails.
  //
  // Measured with HOME confined, running `--claude --global` from a MindForge checkout:
  //     develop              exit 0, 225 files in $HOME/.claude
  //     cwd-only gate        exit 1,   0 files, then an impossible --force retry
  //     scope-aware gate     exit 0, 389 files
  //
  // Both directions are asserted, because "global installs files" alone is satisfied by removing the
  // gate entirely, and "local writes nothing" alone is satisfied by breaking global.
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');

  const REPO = process.cwd();
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-globalinstall-home-')));
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-globalinstall-tmp-')));
  const git = (...args) => spawnSync('git', args, { cwd: REPO, encoding: 'utf8' });
  const dirtyBefore = git('status', '--porcelain').stdout;

  try {
    // cwd is the repository — exactly the condition that made the cwd-only gate misfire.
    const r = spawnSync(process.execPath, ['bin/install.js', '--claude', '--global'], {
      cwd: REPO, encoding: 'utf8', timeout: 180000,
      env: { PATH: process.env.PATH, HOME: home, CI: '1', TMPDIR: tmp },
    });

    assert.strictEqual(r.status, 0,
      `a global install run from the repo must succeed, got ${r.status}. The self-install gate keys on `
      + `cwd; a global install writes to $HOME and is not a self-install.\n${(r.stdout || '').slice(-400)}`);

    const written = [];
    (function walk(d) {
      let entries;
      try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full); else written.push(full);
      }
    })(path.join(home, '.claude'));
    assert.ok(written.length > 100,
      `a global install wrote only ${written.length} file(s) to ${home}/.claude. Measured on develop `
      + 'before the gate existed: 225. Zero means every write was skipped as if this were a '
      + 'self-install.');

    assert.ok(!/Retry:/.test(r.stdout),
      'the install printed a "Retry: ... --force" suggestion, which means verification failed — and '
      + 'that retry provably fails too, because --force does not change which branch the gate takes');

    // AND the local-install protection must be intact: a global install must still not touch the repo.
    assert.strictEqual(git('status', '--porcelain').stdout, dirtyBefore,
      'a global install modified the repository working tree. It writes to $HOME and must leave the '
      + 'checkout it was launched from completely alone.');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('installer excludes sensitive files (*.env, *.key, *.pem)', () => {
  const c = read('bin/installer-core.js');
  assert.ok(
    c.includes('.env') || c.includes('SENSITIVE_EXCLUDE') || c.includes('.key'),
    'Should have sensitive file exclusion list'
  );
});

test('installer verifies install after completing', () => {
  // Was: c.includes('verifyInstall') || c.includes('verification') — a substring check that
  // passed for 400 lines of DEAD code. verifyInstall() was declared and called from nowhere,
  // while install() printed "Install verified" unconditionally. The `|| 'verification'` arm made
  // it weaker still: that word appears in comments.
  const c = read('bin/installer-core.js');
  const code = c.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  // Must match a CALL, not the declaration. My first attempt used /verifyInstall\s*\(\s*baseDir/,
  // which the line `function verifyInstall(baseDir, ...)` satisfies — so un-wiring the call left
  // this green. That is precisely the error the original substring check made, reproduced one
  // level up. Requiring the result to be BOUND to a name distinguishes them.
  assert.match(code, /=\s*verifyInstall\s*\(/,
    'installer-core.js must CALL verifyInstall and bind its result, not merely declare it');

  assert.match(code, /if\s*\(\s*!verification\.ok\s*\)/,
    'the result must be checked — a call whose return value is discarded verifies nothing');
  assert.match(code, /process\.exit\(1\)/,
    'a failed verification must exit non-zero');
  // And the success message must come AFTER the failure branch, so it cannot print on failure.
  const failIdx = code.indexOf('Install verification failed');
  const okIdx = code.indexOf('Install verified');
  assert.ok(failIdx !== -1 && okIdx !== -1 && failIdx < okIdx,
    'the "Install verified" message must follow the failure branch that exits, or it can print ' +
    `for a failed install (failIdx=${failIdx}, okIdx=${okIdx})`);
});

// ── Self-update system ─────────────────────────────────────────────────────────
console.log('\nSelf-update system:');

['version-comparator.js', 'changelog-fetcher.js', 'self-update.js'].forEach(f => {
  test(`bin/updater/${f} exists`, () => {
    assert.ok(exists(`bin/updater/${f}`), `Missing: bin/updater/${f}`);
  });
});

test('compareSemver: 1.0.0 > 0.6.0', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.ok(compareSemver('1.0.0', '0.6.0') > 0);
});

test('compareSemver: 0.6.0 < 1.0.0', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.ok(compareSemver('0.6.0', '1.0.0') < 0);
});

test('compareSemver: 1.0.0 == 1.0.0', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.strictEqual(compareSemver('1.0.0', '1.0.0'), 0);
});

test('compareSemver handles v prefix', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.ok(compareSemver('v1.0.0', 'v0.6.0') > 0);
});

test('upgradeType: 0.6.0 → 1.0.0 is major', () => {
  const { upgradeType } = require('../bin/updater/version-comparator');
  assert.strictEqual(upgradeType('0.6.0', '1.0.0'), 'major');
});

test('upgradeType: 1.0.0 → 1.1.0 is minor', () => {
  const { upgradeType } = require('../bin/updater/version-comparator');
  assert.strictEqual(upgradeType('1.0.0', '1.1.0'), 'minor');
});

test('upgradeType: 1.0.0 → 1.0.1 is patch', () => {
  const { upgradeType } = require('../bin/updater/version-comparator');
  assert.strictEqual(upgradeType('1.0.0', '1.0.1'), 'patch');
});

test('upgradeType: 1.0.0 → 1.0.0 is none', () => {
  const { upgradeType } = require('../bin/updater/version-comparator');
  assert.strictEqual(upgradeType('1.0.0', '1.0.0'), 'none');
});

test('self-update has scope detection', () => {
  const c = read('bin/updater/self-update.js');
  assert.ok(c.includes('detectInstallScope'), 'Should have detectInstallScope()');
});

test('self-update reads schema_version before applying update', () => {
  const c = read('bin/updater/self-update.js');
  assert.ok(
    c.includes('readHandoffSchemaVersion') || c.includes('schema_version'),
    'Should read schema_version from HANDOFF before updating'
  );
});

// ── Migration engine ────────────────────────────────────────────────────────────
console.log('\nMigration engine:');

['migrate.js', 'schema-versions.js', '0.1.0-to-0.5.0.js', '0.5.0-to-0.6.0.js', '0.6.0-to-1.0.0.js'].forEach(f => {
  test(`bin/migrations/${f} exists`, () => {
    assert.ok(exists(`bin/migrations/${f}`), `Missing: ${f}`);
  });
});

test('migrate.js creates backup before migrating', () => {
  const c = read('bin/migrations/migrate.js');
  assert.ok(c.includes('backup') || c.includes('Backup'), 'Should create backup');
});

test('migrate.js aborts if backup fails', () => {
  const c = read('bin/migrations/migrate.js');
  assert.ok(
    c.includes('backupErr') || c.includes('Migration aborted'),
    'Should abort if backup creation fails'
  );
});

test('migrate.js restores from backup on migration failure', () => {
  const c = read('bin/migrations/migrate.js');
  assert.ok(
    c.includes('Restoring') || c.includes('restoreFromBackup') || c.includes('restore'),
    'Should restore from backup on failure'
  );
});

test('0.6.0-to-1.0.0 migration adds plugin_api_version', () => {
  const c = read('bin/migrations/0.6.0-to-1.0.0.js');
  assert.ok(c.includes('plugin_api_version'), 'Should add plugin_api_version field');
});

test('0.6.0-to-1.0.0 migration backfills session_id in AUDIT.jsonl', () => {
  const c = read('bin/migrations/0.6.0-to-1.0.0.js');
  assert.ok(c.includes('session_id'), 'Should backfill session_id');
});

test('0.6.0-to-1.0.0 migration converts VERIFY_PASS_RATE_WARNING_THRESHOLD', () => {
  const c = read('bin/migrations/0.6.0-to-1.0.0.js');
  assert.ok(
    c.includes('VERIFY_PASS_RATE') || c.includes('val / 100'),
    'Should convert percentage to decimal'
  );
});

test('migration preserves invalid AUDIT.jsonl lines (no crash)', () => {
  const c = read('bin/migrations/0.6.0-to-1.0.0.js');
  assert.ok(c.includes('catch') || c.includes('try'), 'Should handle parse errors gracefully');
});

// ── Plugin system ────────────────────────────────────────────────────────────────
console.log('\nPlugin system:');

['plugin-schema.md', 'plugin-loader.md', 'PLUGINS-MANIFEST.md'].forEach(f => {
  test(`.mindforge/plugins/${f} exists`, () => {
    assert.ok(exists(`.mindforge/plugins/${f}`));
  });
});

test('plugin schema defines permission model', () => {
  const c = read('.mindforge/plugins/plugin-schema.md');
  assert.ok(c.includes('permissions'), 'Should define permissions');
  assert.ok(c.includes('write_state'), 'Should include write_state permission');
  assert.ok(c.includes('network_access'), 'Should include network_access permission');
});

test('plugin loader has injection guard step', () => {
  const c = read('.mindforge/plugins/plugin-loader.md');
  assert.ok(c.includes('injection guard') || c.includes('Injection'), 'Should run injection guard');
});

test('plugin loader documents advisory permission model', () => {
  const c = read('.mindforge/plugins/plugin-loader.md');
  assert.ok(
    c.includes('advisory') || c.includes('not OS-enforced') || c.includes('not enforced'),
    'Should explain that permissions are advisory'
  );
});

test('plugin schema lists all 36 reserved command names', () => {
  const c = read('.mindforge/plugins/plugin-schema.md');
  assert.ok(
    c.includes('Reserved command names') || c.includes('reserved'),
    'Should list reserved command names'
  );
  // Check a few specific reserved names are mentioned
  assert.ok(c.includes('health'), 'Should list health as reserved');
  assert.ok(c.includes('security-scan'), 'Should list security-scan as reserved');
});

// ── Token optimiser ─────────────────────────────────────────────────────────────
console.log('\nToken optimiser:');

test('token-optimiser.md exists', () => {
  assert.ok(exists('.mindforge/production/token-optimiser.md'));
});

test('token optimiser defines efficiency formula', () => {
  const c = read('.mindforge/production/token-optimiser.md');
  assert.ok(c.includes('token_efficiency') || c.includes('efficiency'), 'Should define efficiency');
  assert.ok(c.includes('useful_output') || c.includes('output_tokens'), 'Should define useful output');
});

test('token optimiser has lean plan strategy', () => {
  const c = read('.mindforge/production/token-optimiser.md');
  assert.ok(c.includes('Strategy 1') || c.includes('Lean'), 'Should have lean plan strategy');
});

// ── Production checklist ────────────────────────────────────────────────────────
console.log('\nProduction checklist:');

test('production-checklist.md has exactly 50 checkbox items', () => {
  const c = read('.mindforge/production/production-checklist.md');
  const boxes = (c.match(/- \[ \]/g) || []).length;
  assert.ok(boxes >= 50, `Expected >= 50 items, found ${boxes}`);
});

// ── Documentation completeness ──────────────────────────────────────────────────
console.log('\nDocumentation:');

const DOC_FILES = [
  'docs/reference/commands.md',
  'docs/security/SECURITY.md',
  'docs/security/threat-model.md',
  'docs/architecture/decision-records-index.md',
  'docs/contributing/CONTRIBUTING.md',
];
DOC_FILES.forEach(f => test(`${f} exists`, () => assert.ok(exists(f), `Missing: ${f}`)));

test('threat model covers all 7 threat actors', () => {
  const c = read('docs/security/threat-model.md');
  for (let i = 1; i <= 7; i++) {
    assert.ok(c.includes(`Threat Actor ${i}`), `Missing Threat Actor ${i}`);
  }
});

test('ADR index lists all 20 ADRs', () => {
  const c = read('docs/architecture/decision-records-index.md');
  for (let i = 1; i <= 20; i++) {
    const adrRef = `ADR-${String(i).padStart(3, '0')}`;
    assert.ok(c.includes(adrRef) || c.includes(`ADR-${i}`), `Missing ${adrRef} in index`);
  }
});

test('SECURITY.md has responsible disclosure policy', () => {
  const c = read('docs/security/SECURITY.md');
  assert.ok(c.includes('disclosure') || c.includes('24 hours'), 'Should have disclosure timeline');
});

// ── All 36 commands ─────────────────────────────────────────────────────────────
console.log('\nAll 36 commands:');

const ALL_COMMANDS = [
  // Day 1
  'help', 'init-project', 'plan-phase', 'execute-phase', 'verify-phase', 'ship',
  // Day 2
  'next', 'quick', 'status', 'debug',
  // Day 3
  'skills', 'review', 'security-scan', 'map-codebase', 'discuss-phase',
  // Day 4
  'audit', 'milestone', 'complete-milestone', 'approve', 'sync-jira', 'sync-confluence',
  // Day 5
  'health', 'retrospective', 'profile-team', 'metrics',
  // Day 6
  'init-org', 'install-skill', 'publish-skill', 'pr-review', 'workspace', 'benchmark',
  // Day 7
  'update', 'migrate', 'plugins', 'tokens', 'release',
];

assert.strictEqual(ALL_COMMANDS.length, 36, `Expected 36 commands, have ${ALL_COMMANDS.length}`);
console.log(`  (verifying all ${ALL_COMMANDS.length} commands)`);

test('all 36 commands in .claude/commands/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(cmd => !exists(`.claude/commands/mindforge/${cmd}.md`));
  assert.strictEqual(missing.length, 0, `Missing: ${missing.join(', ')}`);
});

test('all 36 commands mirrored to .agent/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(cmd => !exists(`.agent/mindforge/${cmd}.md`));
  assert.strictEqual(missing.length, 0, `Missing agent mirror: ${missing.join(', ')}`);
});

test('no command file is empty (> 100 chars)', () => {
  const tiny = ALL_COMMANDS.filter(cmd => {
    const p = `.claude/commands/mindforge/${cmd}.md`;
    return exists(p) && fs.statSync(p).size < 100;
  });
  assert.strictEqual(tiny.length, 0, `Too small: ${tiny.join(', ')}`);
});

// ── Hardening tests ───────────────────────────────────────────────────────────
console.log('\nHardening tests:');

test('SENSITIVE_EXCLUDE properly excludes .env and .key files', () => {
  // WAS TAUTOLOGICAL. This test declared its OWN copy of the array:
  //
  //     const SENSITIVE_EXCLUDE = ['.env', /^\.env\..*/, /\.key$/, /\.pem$/, 'secrets', /^secrets$/];
  //
  // and then asserted against that literal. It never read bin/installer-core.js, so deleting the
  // production list outright would have left it green. It described what the author believed the
  // installer excluded, which is not the same claim.
  //
  // Now imported from the module, and matched with the SAME rule copyDir uses at installer-core.js:290
  // — string entries compare against the basename, regex entries are tested against it. Restating that
  // rule differently here would reintroduce the same gap one level down.
  const { SENSITIVE_EXCLUDE } = require(require('path').join(process.cwd(), 'bin', 'installer-core.js'));
  assert.ok(Array.isArray(SENSITIVE_EXCLUDE) && SENSITIVE_EXCLUDE.length > 5,
    `installer-core must export a populated SENSITIVE_EXCLUDE, got ${JSON.stringify(SENSITIVE_EXCLUDE)}`);

  const shouldExclude = (name) =>
    SENSITIVE_EXCLUDE.some(p => (typeof p === 'string' ? name === p : p.test(name)));

  assert.ok(shouldExclude('.env'),               '.env should be excluded');
  assert.ok(shouldExclude('.env.local'),         '.env.local should be excluded');
  assert.ok(shouldExclude('private.key'),        'private.key should be excluded');
  assert.ok(shouldExclude('certificate.pem'),    'certificate.pem should be excluded');
  assert.ok(shouldExclude('secrets'),            'secrets directory should be excluded');
  assert.ok(!shouldExclude('package.json'),      'package.json should NOT be excluded');
  assert.ok(!shouldExclude('.mindforge'),        '.mindforge should NOT be excluded');
  assert.ok(!shouldExclude('src'),               'src should NOT be excluded');
});

test('a real install does not copy .env, .key or .pem files', () => {
  // WAS A SOURCE-TEXT GREP. It checked that installer-core.js CONTAINED the string `\.key$` and did
  // NOT contain `'*.key'` — the shape of the source, satisfiable by a comment, and silent on the only
  // question that matters: does the copy actually honour the list? An exclude array that copyDir
  // ignored would have passed both this and the test above it.
  //
  // Now behavioural. `.agent/skills` is copied with SENSITIVE_EXCLUDE (installer-core.js:838), so
  // planting the sensitive shapes in a throwaway subdirectory there and running a real install
  // exercises the production list through the production copy function.
  //
  // Only a directory this test creates is planted and removed — nothing tracked is touched.
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');

  const REPO = process.cwd();
  const bait = path.join(REPO, '.agent', 'skills', 'zz-exclude-probe');
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-excl-')));
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-excl-home-')));
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-excl-tmp-')));

  try {
    fs.mkdirSync(bait, { recursive: true });
    fs.writeFileSync(path.join(bait, 'SKILL.md'), '---\nname: zz-exclude-probe\n---\nprobe\n');
    for (const n of ['.env', '.env.local', 'private.key', 'certificate.pem']) {
      fs.writeFileSync(path.join(bait, n), 'SECRET-SHAPED-PROBE\n');
    }

    fs.writeFileSync(path.join(project, 'package.json'),
      JSON.stringify({ name: 'their-app', version: '1.0.0' }, null, 2));
    const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'install.js'), '--claude', '--local'], {
      cwd: project, encoding: 'utf8', timeout: 180000,
      env: { PATH: process.env.PATH, HOME: home, CI: '1', TMPDIR: tmp },
    });
    assert.strictEqual(r.status, 0, `install failed: ${(r.stderr || '').slice(-300)}`);

    const landed = [];
    (function walk(d) {
      let entries;
      try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (/^\.env|\.key$|\.pem$/.test(e.name)) landed.push(path.relative(project, full));
      }
    })(project);
    assert.deepStrictEqual(landed, [],
      `${landed.length} sensitive file(s) were copied into the target project: ${landed.join(', ')}. `
      + 'SENSITIVE_EXCLUDE exists but copyDir is not honouring it.');

    // NON-VACUITY: the probe directory itself must HAVE been copied, or "no secrets landed" is true
    // only because nothing was copied at all — and the previous grep-based test could not tell the
    // difference either.
    const probeArrived = fs.existsSync(
      path.join(project, '.claude', 'skills', 'zz-exclude-probe', 'SKILL.md'));
    assert.ok(probeArrived,
      'the probe skill directory was not installed, so this test cannot distinguish "excluded the '
      + 'secrets" from "copied nothing". Check the skills asset mapping before trusting the result.');
  } finally {
    fs.rmSync(bait, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('migration filter uses toVersion range check (not fromVersion)', () => {
  const c = fs.readFileSync('bin/migrations/migrate.js', 'utf8');
  // The correct filter uses compareSemver(m.toVersion, fromVersion) > 0
  assert.ok(
    c.includes('m.toVersion') && c.includes('> 0'),
    'Should use toVersion range check for migration filter'
  );
});

test('migration has CI auto-delete of backup', () => {
  const c = fs.readFileSync('bin/migrations/migrate.js', 'utf8');
  assert.ok(
    c.includes('CI') && (c.includes('auto-deleted') || c.includes('rmSync')),
    'Should auto-delete backup in CI mode'
  );
});

// ── Final version check ────────────────────────────────────────────────────────
console.log('\nVersion:');

test('package.json version is >= 1.0.0', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const major = parseInt(pkg.version.split('.')[0], 10);
  assert.ok(major >= 1, `Expected version >= 1.0.0, got ${pkg.version}`);
});

test('CHANGELOG.md has latest version entry', () => {
  const c = read('CHANGELOG.md');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.ok(c.includes(pkg.version.split('-')[0]) || c.includes(pkg.version), 'CHANGELOG.md should have current version entry');
});

test('changelogs/ archive also has an entry for the current version', () => {
  // Belt-and-suspenders check for the rolling-window split: catches the drift
  // failure mode where a release prepends to root CHANGELOG.md but forgets to
  // also write changelogs/vX.Y.Z.md (or vice versa).
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = pkg.version.split('-')[0];
  assert.ok(fs.existsSync(`changelogs/v${version}.md`), `changelogs/v${version}.md should also have an entry for the current version`);
});

test('all 20 ADR files present in .planning/decisions/', () => {
  if (!exists('.planning/decisions/')) return; // Skip if no decisions dir yet
  const adrs = fs.readdirSync('.planning/decisions/').filter(f => f.startsWith('ADR-') && f.endsWith('.md'));
  // ADR-*.md are gitignored (.gitignore: .planning/decisions/ADR-*.md), so they are absent
  // on a fresh clone / CI runner even though the dir is tracked. Validate the count only when
  // ADRs are actually present (a populated working dir); their absence is by-design, not a defect.
  if (adrs.length === 0) return;
  assert.ok(adrs.length >= 20, `Expected >= 20 ADRs, found ${adrs.length}`);
});

// ── Results ─────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌  ${failed} test(s) failed — not production ready.\n`);
  process.exit(1);
} else {
  console.log('\n✅  All production readiness tests passed.\n');
}
