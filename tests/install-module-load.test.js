/**
 * Guards the installed runtime: every internal require in an INSTALLED module must resolve.
 *
 * THE DEFECT. bin/installer-core.js copied an 11-entry `sovereignEngines` allowlist of feature
 * directories and none of their dependencies. Measured on a clean `node bin/install.js --claude
 * --local` into an empty consumer project, 16 of 119 installed modules failed to load with
 * MODULE_NOT_FOUND, spread across seven subtrees:
 *
 *   bin/autonomous/audit-writer.js      -> ../utils/file-lock      (the audit-chain WRITER)
 *   bin/autonomous/auto-runner.js       -> ../utils/file-lock
 *   bin/autonomous/state-manager.js     -> ../utils/file-io
 *   bin/engine/{intelligence-interlock,logic-drift-detector,nexus-tracer}.js -> ../utils/index
 *   bin/governance/policy-engine.js     -> ../utils/file-io
 *   bin/memory/{auto-shadow,knowledge-capture,knowledge-graph}.js -> ../utils/file-lock
 *   bin/models/{model-client,model-router}.js -> ../utils/mindforge-params
 *   bin/research/research-engine.js     -> ../utils/mindforge-params
 *   bin/skills-builder/{learn-cli,pattern-detector,skill-generator}.js -> ../utils/mindforge-params
 *
 * bin/utils/ shipped in the tarball the whole time — it was simply never copied into the project.
 * So this was not a packaging gap; the installer reported success and left a runtime that could
 * not load its own audit writer, policy engine or model router.
 *
 * WHY STATIC RESOLUTION, NOT EXECUTION. Requiring every installed module also trips things that
 * are not defects: bin/dashboard/server.js exits when the optional `express` is absent, and
 * bin/engine/verify-cli.js plus two skills-builder CLIs have no `require.main` guard, so
 * requiring them RUNS them and they exit non-zero on missing arguments. Static resolution
 * isolates exactly the defect class and cannot be fooled by a module that exits. A small
 * execution spot-check follows for the highest-value modules, to prove they genuinely load.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const INSTALLER = path.join(REPO_ROOT, 'bin', 'install.js');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** Recursively collect .js files under `dir`, returned relative to `base`. */
function jsFiles(dir, base, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) jsFiles(p, base, acc);
    else if (e.name.endsWith('.js')) acc.push(path.relative(base, p));
  }
  return acc;
}

// ── One real install, reused by every assertion below ────────────────────────
// The install is the expensive part (a few seconds); the checks are cheap.
const PROJECT = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-installload-')));
fs.writeFileSync(path.join(PROJECT, 'package.json'),
  JSON.stringify({ name: 'their-app', version: '1.0.0' }, null, 2));

// A THROWAWAY HOME, not the operator's. installer-core.js:253 resolves its project registry as
// path.join(os.homedir(), '.mindforge', 'registry.json'), and os.homedir() honours $HOME on POSIX —
// so handing this child `HOME: process.env.HOME` makes every run of this suite append a tmpdir path
// to the developer's real ~/.mindforge/registry.json. Measured before this fix: 237 of 245 entries
// in a real registry were test-suite temp dirs (97%), 49 of them from this file's mf-installload-
// prefix alone. `npm test` runs on every Husky pre-commit, so the pollution compounded silently.
// tests/no-home-leak.test.js now bans the pattern repo-wide.
const HOME_DIR = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-installload-home-')));

const install = spawnSync(process.execPath, [INSTALLER, '--claude', '--local'], {
  cwd: PROJECT, encoding: 'utf8',
  env: { PATH: process.env.PATH, HOME: HOME_DIR, CI: '1' },
});

const installedBin = path.join(PROJECT, 'bin');
const installed = jsFiles(installedBin, PROJECT).map(p => p.split(path.sep).join('/'));

/**
 * Strip line and block comments before scanning for require() calls.
 *
 * Without this the scan reports bin/governance/rbac.js -> ./governance/rbac, which is a require
 * written inside a COMMENT on line 3 of that file ("Any require('./governance/rbac') or
 * require('./rbac') will resolve here."). A regex over raw source cannot tell prose from code —
 * the same false-positive class that this repo's CI-gate test hit on a phrase inside the comment
 * documenting its own removal.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(l => l.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
}

/**
 * Requires the installer deliberately does NOT satisfy, each with its reason.
 *
 * bin/wizard/setup-wizard.js lazily requires ../installer-core (line 154) and ../install
 * (line 209) INSIDE function bodies, so the module loads fine and only the wizard's re-install
 * path would fail. Satisfying them means copying the installer itself into every consumer
 * project, which is a footprint and blast-radius decision rather than a missing-file bug — the
 * wizard arguably ought to shell out to `npx mindforge-cc` instead. Recorded here as a KNOWN
 * GAP so it is a deliberate exclusion rather than an oversight, and asserted below to still have
 * the shape described, so a change to the wizard forces this to be revisited.
 */
const KNOWN_GAPS = [
  { file: 'bin/wizard/setup-wizard.js', spec: '../installer-core' },
  { file: 'bin/wizard/setup-wizard.js', spec: '../install' },
];
const isKnownGap = (file, spec) => KNOWN_GAPS.some(g => g.file === file && g.spec === spec);

/** Resolve a relative require specifier from `fromRel` against a root, Node-style. */
function resolveFrom(root, fromRel, spec) {
  const joined = path.posix.join(path.posix.dirname(fromRel), spec);
  for (const cand of [joined, `${joined}.js`, `${joined}.json`, path.posix.join(joined, 'index.js')]) {
    if (fs.existsSync(path.join(root, cand))) return { ok: true, target: cand };
  }
  return { ok: false, target: `${joined}.js` };
}

test('the install itself succeeded', () => {
  assert.strictEqual(install.status, 0,
    `installer exited ${install.status}. stderr:\n${(install.stderr || '').slice(0, 1200)}`);
  assert.ok(installed.length > 50,
    `expected a substantial installed bin/, found ${installed.length} module(s)`);
});

test('every internal require in an installed module resolves inside the install', () => {
  // The assertion that would have caught the 16 broken modules. It walks what was INSTALLED,
  // not what ships — the tarball was complete and the install was not, so a packaging check
  // could not have found this.
  const broken = [];
  for (const rel of installed) {
    const src = stripComments(fs.readFileSync(path.join(PROJECT, rel), 'utf8'));
    for (const m of src.matchAll(/require\((['"])(\.[^'"]+)\1\)/g)) {
      const spec = m[2];
      const r = resolveFrom(PROJECT, rel, spec);
      if (r.ok) continue;
      // A module may legitimately reach the PROJECT root (e.g. ../../package.json, which a
      // consumer always has). Only flag targets that fall inside the installed tree.
      if (!r.target.startsWith('bin/')) continue;
      if (isKnownGap(rel, spec)) continue;
      broken.push(`${rel}  ->  ${spec}   (would resolve to ${r.target})`);
    }
  }
  assert.deepStrictEqual(broken, [],
    `${broken.length} installed module(s) require a file the installer did not copy. This is the ` +
    'sovereignEngines allowlist drifting from what the engines actually need:\n  ' +
    broken.join('\n  '));
});

test('bin/utils/ is installed — 16 modules across 7 subtrees depend on it', () => {
  // Named explicitly because it is the single directory whose absence caused every one of the
  // original 16 failures, and because it is a DEPENDENCY rather than a feature, which is exactly
  // why it was omitted from a list of "engines".
  for (const f of ['file-lock.js', 'file-io.js', 'index.js', 'mindforge-params.js']) {
    assert.ok(fs.existsSync(path.join(installedBin, 'utils', f)),
      `bin/utils/${f} must be installed; without it the audit writer, policy engine and model ` +
      'router all fail to load');
  }
});

test('bin/hindsight-injector.js is installed for the two modules that require it', () => {
  // Required by bin/dashboard/temporal-api.js and bin/engine/temporal-cli.js, both of which are
  // installed. It replaced a `coreEngines` array that was declared and never referenced.
  assert.ok(fs.existsSync(path.join(installedBin, 'hindsight-injector.js')),
    'bin/hindsight-injector.js must be installed');
});

test('every script the router can dispatch to is actually installed', () => {
  // THE DEFECT. `sovereignEngines` copies bin/ SUBDIRECTORIES, so the 13 nested scripts in the
  // COMMANDS table arrive. The 6 that live directly in bin/ had no carrier beyond `coreFiles`, which
  // held two entries. Measured on a clean install: 11 of 27 routed verbs died in Node's module loader.
  //
  //     security-scan   Cannot find module '<proj>/bin/validate-config.js'
  //     health          Cannot find module '<proj>/bin/installer-core.js'
  //     classify        Cannot find module '<proj>/bin/change-classifier.js'
  //     validate-skill  Cannot find module '<proj>/bin/skill-validator.js'
  //     install-skill / register-skill / audit-skill   bin/skill-registry.js
  //     spawn / identity / subagent                    bin/spawn-agent.js
  //     test-memory     tests/memory.test.js
  //
  // Two of them carry most of the weight: `security-scan` is the verb the protocol mandates
  // PRE-COMMIT for Auth/Payment/PII changes, and `health` is step 1 of "Verify install" in
  // docs/getting-started.md:110 — so the documented first command a new user runs exited non-zero
  // with a stack trace.
  //
  // WHY THE EXISTING CHECKS MISSED IT. The resolution test above walks what WAS installed and
  // verifies its internal requires; those were complete. The gap was one level up — files the ROUTER
  // names that were never copied at all, so there was no installed module whose requires could fail.
  //
  // DERIVED FROM THE COMMANDS TABLE, never a hardcoded list, so adding a route without adding a
  // carrier to coreFiles fails here immediately rather than at a user's terminal.
  const routerSrc = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'mindforge-cli.js'), 'utf8');
  const table = routerSrc.slice(routerSrc.indexOf('const COMMANDS'),
    routerSrc.indexOf('// ── Workflow subcommand'));
  const routed = [...new Set([...table.matchAll(/script:\s*'([^']+)'/g)].map((m) => m[1]))];

  // NON-VACUITY: a broken slice or a changed table shape would otherwise pass by finding nothing.
  assert.ok(routed.length >= 20,
    `only ${routed.length} routed script(s) parsed out of bin/mindforge-cli.js — the COMMANDS table `
    + 'changed shape, so this check would cover almost nothing');

  // The installer can only copy what npm ships. tests/ is excluded from package.json files[], so
  // tests/memory.test.js is not in the tarball and no installer change can place it — the fix for
  // that verb is removing it from the router. Split rather than exempted, so the unshippable set is
  // reported and asserted rather than quietly skipped.
  const packlist = new Set(JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }))[0].files.map((f) => f.path));

  const shippable = routed.filter((r) => packlist.has(r));
  const unshippable = routed.filter((r) => !packlist.has(r));

  const missing = shippable.filter((r) => !fs.existsSync(path.join(PROJECT, r)));
  assert.deepStrictEqual(missing, [],
    `${missing.length} routed script(s) ship in the tarball but were NOT installed, so those verbs `
    + `die in the module loader:\n  ${missing.join('\n  ')}\n`
    + 'Add them to coreFiles in bin/installer-core.js.');

  // And the unshippable set is asserted, not ignored: if it grows, a new verb has been pointed at
  // something npm does not publish, and the router is the place to fix it.
  assert.deepStrictEqual(unshippable, ['tests/memory.test.js'],
    `the set of routed scripts that npm does not publish changed to: ${unshippable.join(', ')}. `
    + 'A verb pointing at an unpublished file can never work in a consumer install — remove the route '
    + 'from bin/mindforge-cli.js rather than trying to install the file.');
});

test('the dead coreEngines array has not come back', () => {
  // Six paths, four under bin/sre/, copied by nothing. bin/sre/ stays uninstalled deliberately:
  // no installed module requires it, so wiring the array would ship files nothing loads.
  const core = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'installer-core.js'), 'utf8');
  const decls = [...core.matchAll(/const\s+(\w+)\s*=\s*\[/g)].map(m => m[1]);
  for (const name of decls) {
    const uses = (core.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    assert.ok(uses > 1,
      `bin/installer-core.js declares \`${name}\` and never uses it. A copy list that nothing ` +
      'reads is indistinguishable from files that are not installed — delete it or wire it.');
  }
});

test('the known gap still has the shape its exemption assumes', () => {
  // An exemption is only honest while its premise holds. The premise is that setup-wizard's two
  // installer requires are LAZY — inside function bodies — so the module loads and only the
  // re-install path fails. If either moved to module scope, the exemption would be hiding a
  // module that cannot load at all, and this must fail so the gap is re-decided.
  const wiz = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'wizard', 'setup-wizard.js'), 'utf8');
  const lines = wiz.split('\n');
  for (const { spec } of KNOWN_GAPS) {
    const idx = lines.findIndex(l => l.includes(`require('${spec}')`));
    assert.notStrictEqual(idx, -1,
      `setup-wizard.js no longer requires ${spec} — remove it from KNOWN_GAPS`);
    // Module scope means zero leading indentation on the statement.
    assert.match(lines[idx], /^\s+/,
      `require('${spec}') is at setup-wizard.js module scope (line ${idx + 1}), not inside a ` +
      'function. The exemption assumed a lazy require; the module now cannot load at all. ' +
      'Either install the dependency or have the wizard shell out to `npx mindforge-cc`.');
  }
  assert.ok(fs.existsSync(path.join(installedBin, 'wizard', 'setup-wizard.js')),
    'the exemption only matters while setup-wizard is actually installed');
});

test('installed modules that DO load, actually load — executed spot check', () => {
  // Static resolution proves the files are present; this proves they initialise. Restricted to
  // modules with no optional external dep and no CLI side effect on require, because
  // bin/dashboard/server.js exits without `express` and three CLIs run on require.
  const spot = [
    'bin/autonomous/audit-writer.js',
    'bin/governance/policy-engine.js',
    'bin/models/model-router.js',
    'bin/memory/knowledge-graph.js',
    'bin/engine/nexus-tracer.js',
  ];
  const failures = [];
  for (const rel of spot) {
    const abs = path.join(PROJECT, rel);
    if (!fs.existsSync(abs)) { failures.push(`${rel}: not installed`); continue; }
    const r = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(abs)})`], {
      cwd: PROJECT, encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: HOME_DIR },
    });
    if (r.status !== 0) {
      failures.push(`${rel}: exit ${r.status} — ${(r.stderr || '').split('\n').find(l => /Error/.test(l)) || ''}`);
    }
  }
  assert.deepStrictEqual(failures, [],
    `installed module(s) failed to load:\n  ${failures.join('\n  ')}`);
});

test('a missing dependency WOULD be caught (negative control)', () => {
  // Without this, the resolution test above could pass because the walker finds no requires at
  // all. Deleting one dependency from the install must make it fail.
  const victim = path.join(installedBin, 'utils', 'file-lock.js');
  assert.ok(fs.existsSync(victim), 'fixture precondition: bin/utils/file-lock.js is installed');
  const saved = fs.readFileSync(victim);
  fs.rmSync(victim);
  try {
    const broken = [];
    for (const rel of installed) {
      const abs = path.join(PROJECT, rel);
      if (!fs.existsSync(abs)) continue;   // the file this probe just deleted
      const src = stripComments(fs.readFileSync(abs, 'utf8'));
      for (const m of src.matchAll(/require\((['"])(\.[^'"]+)\1\)/g)) {
        const r = resolveFrom(PROJECT, rel, m[2]);
        if (!r.ok && r.target.startsWith('bin/') && !isKnownGap(rel, m[2])) broken.push(rel);
      }
    }
    assert.ok(broken.length > 0,
      'removing bin/utils/file-lock.js must make the resolution check fail; it did not, so that ' +
      'check proves nothing');
    assert.ok(broken.some(f => f.includes('audit-writer')),
      `and it must name the audit-chain writer among the breakages, got: ${broken.join(', ')}`);
  } finally {
    fs.writeFileSync(victim, saved);
  }
});

// ── verifyInstall must actually verify ───────────────────────────────────────

test('verifyInstall reports OK for the install just performed', () => {
  // It was DEAD CODE: declared in installer-core.js and called from nowhere, while install()
  // printed "Install verified" unconditionally under a header reading "4. Verify installation".
  // Two tests kept it alive by asserting the SOURCE CONTAINED the string "verifyInstall" — one of
  // them against bin/install.js, where the only occurrence was a comment added to satisfy that
  // very assertion.
  const { verifyInstall, RUNTIMES } = require(path.join(REPO_ROOT, 'bin', 'installer-core.js'));
  const cwd = process.cwd();
  try {
    process.chdir(PROJECT);
    const baseDir = path.join(PROJECT, RUNTIMES.claude.localDir);
    const cmdsDir = path.join(baseDir, RUNTIMES.claude.commandsSubdir);
    const r = verifyInstall(baseDir, cmdsDir, 'claude', 'local');
    assert.strictEqual(r.ok, true,
      `a clean install must verify. Missing: ${r.missing.join(', ')}`);
    assert.ok(r.checked >= 12,
      `it must check a meaningful number of files, got ${r.checked} — a contract of one file ` +
      'verifies nothing');
  } finally { process.chdir(cwd); }
});

test('verifyInstall DETECTS a missing required file (negative control)', () => {
  // Without this, "reports OK" would be satisfied by a function that returns {ok:true} always —
  // which is materially what the previous arrangement did, since it never ran.
  const { verifyInstall, RUNTIMES } = require(path.join(REPO_ROOT, 'bin', 'installer-core.js'));
  const cwd = process.cwd();
  const victim = path.join(PROJECT, 'bin', 'governance', 'policy-engine.js');
  const saved = fs.readFileSync(victim);
  try {
    process.chdir(PROJECT);
    fs.rmSync(victim);
    const baseDir = path.join(PROJECT, RUNTIMES.claude.localDir);
    const cmdsDir = path.join(baseDir, RUNTIMES.claude.commandsSubdir);
    const r = verifyInstall(baseDir, cmdsDir, 'claude', 'local');
    assert.strictEqual(r.ok, false, 'removing a required file must make verification fail');
    assert.ok(r.missing.some((f) => f.includes('policy-engine.js')),
      `and it must NAME the missing file, got: ${r.missing.join(', ')}`);
  } finally {
    process.chdir(cwd);
    fs.writeFileSync(victim, saved);
  }
});

test('verifyInstall requires bin/ for LOCAL scope only, because global never writes it', () => {
  // THE DEFECT. Six bin/** paths were required unconditionally against process.cwd(), so every
  // `--claude --global` install ended:
  //
  //     ❌  Install verification failed — 6 of 12 required file(s) missing
  //         Retry: npx mindforge-cc@latest --claude --global --force
  //     exit 1
  //
  // Measured: a global install writes 389 files to $HOME/.claude and ZERO to bin/ anywhere. That is
  // deliberate — the block copying sovereignEngines is gated `if (scope === 'local' && !selfInstall)`.
  // So verification demanded artifacts of an operation the installer had correctly declined to
  // perform, and then advised a --force retry that cannot help, since --force does not change which
  // scope branch runs.
  //
  // Both directions are asserted. "global passes" alone is satisfied by deleting the requirements
  // outright; "local still fails" alone is satisfied by leaving global broken.
  const { verifyInstall, RUNTIMES } = require(path.join(REPO_ROOT, 'bin', 'installer-core.js'));
  const cwd = process.cwd();
  const victim = path.join(PROJECT, 'bin', 'governance', 'policy-engine.js');
  const saved = fs.existsSync(victim) ? fs.readFileSync(victim) : null;
  assert.ok(saved, 'fixture precondition: the local install must have copied policy-engine.js');

  try {
    process.chdir(PROJECT);
    const baseDir = path.join(PROJECT, RUNTIMES.claude.localDir);
    const cmdsDir = path.join(baseDir, RUNTIMES.claude.commandsSubdir);

    // `checked` is printed to the operator as "Install verified (N required files present)", so it has
    // to describe what was actually examined for that scope rather than a fixed number.
    const localAll = verifyInstall(baseDir, cmdsDir, 'claude', 'local');
    const globalAll = verifyInstall(baseDir, cmdsDir, 'claude', 'global');
    assert.strictEqual(localAll.checked, 12, `local scope must check 12, got ${localAll.checked}`);
    assert.strictEqual(globalAll.checked, 6, `global scope must check 6, got ${globalAll.checked}`);

    // Remove a bin/ file: local must notice, global must not care.
    fs.rmSync(victim);
    const localMissing = verifyInstall(baseDir, cmdsDir, 'claude', 'local');
    assert.strictEqual(localMissing.ok, false,
      'local scope installs bin/, so a missing engine file must still fail verification');
    assert.ok(localMissing.missing.some((f) => f.includes('policy-engine.js')),
      `and it must NAME it, got: ${localMissing.missing.join(', ')}`);

    const globalOk = verifyInstall(baseDir, cmdsDir, 'claude', 'global');
    assert.strictEqual(globalOk.ok, true,
      'global scope does not write bin/, so its absence must not fail verification — that is the bug '
      + 'that made every global install exit 1 on a correctly completed run');

    // NON-VACUITY: global must not have gone slack. A missing COMMAND file still has to fail, or this
    // change replaced a false negative with a check that cannot fail at all.
    const cmdVictim = path.join(cmdsDir, 'help.md');
    const cmdSaved = fs.readFileSync(cmdVictim);
    try {
      fs.rmSync(cmdVictim);
      const globalBroken = verifyInstall(baseDir, cmdsDir, 'claude', 'global');
      assert.strictEqual(globalBroken.ok, false,
        'global scope must still fail when a required COMMAND file is missing — it verifies 6 things, '
        + 'not nothing');
    } finally { fs.writeFileSync(cmdVictim, cmdSaved); }
  } finally {
    process.chdir(cwd);
    if (saved) { fs.mkdirSync(path.dirname(victim), { recursive: true }); fs.writeFileSync(victim, saved); }
  }
});

test('verifyInstall does not require files the package never publishes', () => {
  // Its contract used to include docs/registry/COMMANDS.md and docs/registry/PERSONAS.md under the
  // project root. docs/registry/ ships ZERO files in the tarball, so those could never exist in a
  // consumer install: measured 12 of 14 present on a clean --claude --local. Wiring it as written
  // would have exited 1 on every successful install, which is presumably why nobody wired it.
  // Requiring an artefact the package does not publish is a category error, not a copy gap.
  const src = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'installer-core.js'), 'utf8');
  const fn = src.slice(src.indexOf('function verifyInstall'), src.indexOf('// ── Install single runtime'));
  assert.ok(!/docs\/registry/.test(fn),
    'verifyInstall must not require docs/registry/* — that path ships no files, so the ' +
    'requirement is unsatisfiable by construction');
});

// ── The documented entry point must land on the DOCUMENTED path ──────────────
//
// docs/getting-started.md:30 promises "the `mindforge` CLI command is available for runtime
// operations". Measured on a default `--claude --local` install before this was fixed: 152
// bin/**/*.js landed across 15 subdirectories, but only ONE top-level file, and
// `find . -name mindforge-cli.js` returned NOTHING. The whole bin/ copy sat behind --with-utils, an
// "Advanced Setup Option" the documented command does not pass.
//
// The consequence was worse than a missing convenience: every fix to that CLI — the version
// resolver, the router, the command surface — was invisible to anyone following the docs. Asserted
// against the same default install the rest of this file uses, so it cannot pass because a flag was
// quietly added to the harness.

test('a DEFAULT install delivers the documented CLI entry point', () => {
  // Non-vacuity first. If the install failed or wrote almost nothing, "the file is missing" would be
  // true for an uninteresting reason, and "the file is present" could not be trusted either.
  assert.strictEqual(install.status, 0,
    `the shared install failed (${install.status}), so nothing below is meaningful: `
    + String(install.stderr || '').slice(-300));
  assert.ok(installed.length >= 100,
    `only ${installed.length} bin/**/*.js landed (measured 152). The install is not doing its job, so `
    + 'an assertion about one file inside it proves nothing.');

  assert.ok(fs.existsSync(path.join(PROJECT, 'bin', 'mindforge-cli.js')),
    'bin/mindforge-cli.js is absent from a DEFAULT install. docs/getting-started.md tells users to '
    + 'run it, so the documented first-run command fails with MODULE_NOT_FOUND on the CLI itself. It '
    + 'belongs in installer-core.js\'s coreFiles list, not behind --with-utils.');
});

test('the delivered CLI runs, and reports MindForge\'s version not the host app\'s', () => {
  const cli = path.join(PROJECT, 'bin', 'mindforge-cli.js');
  if (!fs.existsSync(cli)) return;   // the test above already reported the real failure

  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cliver-home-')));
  try {
    const r = spawnSync(process.execPath, [cli, '--version'], {
      cwd: PROJECT, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home },
    });
    assert.strictEqual(r.status, 0,
      `\`--version\` exited ${r.status}. Shipping the file is only half the fix — it has to load. `
      + `stderr: ${String(r.stderr || '').slice(0, 300)}`);

    const printed = String(r.stdout || '').trim();
    const expected = require(path.join(REPO_ROOT, 'package.json')).version;
    assert.strictEqual(printed, expected, `printed ${JSON.stringify(printed)}, expected ${expected}`);
    // PROJECT's package.json declares 1.0.0, so this also pins that the version comes from
    // MindForge's manifest rather than the host application's — the defect
    // bin/utils/mindforge-version.js exists to prevent, reachable on the default path for the first
    // time now that the CLI actually ships there.
    assert.notStrictEqual(printed, '1.0.0', 'the host app\'s version surfaced as MindForge\'s');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('a default install carries coreFiles and NOT all of bin/', () => {
  // If someone "simplifies" coreFiles by dropping the withUtils gate, a default install would start
  // carrying all of bin/ — a far larger payload than the documented install promises. Pinned in both
  // directions.
  //
  // DERIVED FROM coreFiles, not a literal. This assertion used to name
  // ['hindsight-injector.js', 'mindforge-cli.js'] outright, which was correct when coreFiles held two
  // entries and went red the moment it legitimately grew to eight — the six routed scripts whose
  // absence killed 11 of 27 verbs. A hardcoded expectation that has to be edited every time the thing
  // it describes changes is not pinning a boundary, it is duplicating a list. So the expectation is
  // parsed out of installer-core.js: adding a coreFile updates both sides at once, and the
  // bulk-copy property is asserted separately as a strict subset.
  const coreSrc = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'installer-core.js'), 'utf8');
  const block = coreSrc.slice(coreSrc.indexOf('const coreFiles = ['));
  const declared = [...block.slice(0, block.indexOf('];')).matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(declared.length >= 2,
    `parsed ${declared.length} coreFiles entries out of installer-core.js — the declaration changed `
    + 'shape, so this check would compare against nothing');

  const expected = declared
    .filter((r) => /^bin\/[^/]+\.js$/.test(r))     // top-level bin/ only; nested ones live elsewhere
    .map((r) => r.slice('bin/'.length)).sort();
  const actual = fs.readdirSync(path.join(PROJECT, 'bin'))
    .filter((f) => f.endsWith('.js')).sort();

  assert.deepStrictEqual(actual, expected,
    `a default install has top-level bin/ files ${JSON.stringify(actual)} but coreFiles declares `
    + `${JSON.stringify(expected)}. MORE means the --with-utils gate was removed rather than a file `
    + 'added; FEWER means a declared coreFile is not being copied.');

  // And the bulk-copy boundary itself: the repository has strictly more top-level bin/ scripts than a
  // default install should carry. Without this, growing coreFiles to cover everything would satisfy
  // the equality above while defeating the purpose of the list.
  const inRepo = fs.readdirSync(path.join(REPO_ROOT, 'bin')).filter((f) => f.endsWith('.js'));
  assert.ok(actual.length < inRepo.length,
    `a default install carries ${actual.length} of the repository's ${inRepo.length} top-level bin/ `
    + 'scripts. Equal means coreFiles has become a bulk copy of bin/.');
});

(async () => {
  try {
    for (const { name, fn } of tests) {
      try { await fn(); console.log(`  ✅  ${name}`); passed++; }
      catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
    }
  } finally {
    fs.rmSync(PROJECT, { recursive: true, force: true });
  }
  console.log(`\nInstalled Module Load: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
