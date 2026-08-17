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
const { spawnSync } = require('node:child_process');

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

const install = spawnSync(process.execPath, [INSTALLER, '--claude', '--local'], {
  cwd: PROJECT, encoding: 'utf8',
  env: { PATH: process.env.PATH, HOME: process.env.HOME, CI: '1' },
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
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
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
