/**
 * The artifact the plugin SHIPS must be the artifact the repository REVIEWED.
 *
 * THE DEFECT. mcp-server/ does not reimplement the SDK — it vendors the SDK's TypeScript source via
 * scripts/vendor-sdk-into-mcp.js into mcp-server/src/vendor/, and esbuild inlines that into the single
 * tracked bundle the Claude Code plugin ships (plugins/mindforge/mcp/dist/index.js, ~768 KB). Nothing
 * compared the vendored copy against sdk/src, and nothing compared the tracked bundle against the
 * source it was built from. Both links had drifted:
 *
 *     types.ts     4167 B  identical
 *     events.ts    7081 B  DRIFTED — expected 7704 B   (623 bytes behind)
 *     client.ts   13650 B  DRIFTED — expected 13742 B   (92 bytes behind)
 *     memory.ts   27507 B  identical
 *
 *     git log -1 -- sdk/src/events.ts sdk/src/client.ts  -> 10de9c1
 *     git log -1 -- mcp-server/src/vendor/               -> 7ffb48c   (earlier, never re-vendored)
 *
 * And the staleness was PRESENT IN THE SHIPPED BUNDLE, not just in an intermediate file:
 *
 *     grep -c 'event.data.toString()' plugins/mindforge/mcp/dist/index.js  -> 1   (the old SDK)
 *     grep -c 'String(event.data)'    plugins/mindforge/mcp/dist/index.js  -> 0   (the current SDK)
 *
 * So users installing the marketplace plugin got SDK code one revision behind the reviewed source,
 * and no gate could see it. The vendoring script has no npm-script or CI caller at all — it is run by
 * hand, and it had not been run since the SDK changed.
 *
 * WHAT WAS REFUTED. The finding that prompted this arrived as "vendor_script_gates reads 0, so nothing
 * guards the vendored code". That metric does not exist:
 *
 *     grep -rn "vendor_script_gates" --include=*.js --include=*.json --include=*.md .  -> 0 hits
 *
 * bin/harness-audit.js names its checks in kebab-case, never snake_case, so the name is not from this
 * repository's vocabulary. There was no metric reading 0; there was no metric. The drift underneath it
 * was real, which is why this file exists — but the number cited as evidence was not.
 *
 * WHY THE VENDOR LINK IS THE HARD LOCAL GATE. Vendoring is a pure function — BANNER + sdk/src/<f> —
 * so comparing bytes needs no build, no node_modules, and no platform assumptions, and it catches
 * every kind of drift including type-only changes that leave no runtime trace. That is exactly the
 * defect that occurred.
 *
 * WHY THE BUNDLE LINK IS GATED IN CI INSTEAD. Checking the bundle requires building it, which needs
 * mcp-server/node_modules — absent here and gitignored. Measured locally, the build IS byte-
 * reproducible: two full regenerations of the same tree produced the identical sha, so no timestamp or
 * absolute path is embedded and nothing needs normalising away. The CI step rebuilds and compares
 * bytes. The assertion below that CI does so is UNCONDITIONAL, so this file has no branch that can
 * pass by doing nothing — the trap that makes an environment-conditional test worthless.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const VENDOR_SCRIPT = path.join(REPO_ROOT, 'scripts', 'vendor-sdk-into-mcp.js');
const VENDOR_DIR = path.join(REPO_ROOT, 'mcp-server', 'src', 'vendor');
const SDK_SRC = path.join(REPO_ROOT, 'sdk', 'src');
const PLUGIN_BUNDLE = path.join(REPO_ROOT, 'plugins', 'mindforge', 'mcp', 'dist', 'index.js');
const MCP_DIST = path.join(REPO_ROOT, 'mcp-server', 'dist', 'index.js');
const CI = path.join(REPO_ROOT, '.github', 'workflows', 'mindforge-ci.yml');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * The vendored closure and banner, taken FROM the script itself.
 *
 * A test that restates its own copy of FILES and BANNER stops testing the vendoring script and starts
 * testing the duplicate — which is how a stale plugin hook shipped for two commits while four suites
 * passed. Requiring it is safe only because the script now guards its writes behind require.main; the
 * assertion below pins that, and it FAILED when first written, because the script did write on import.
 */
function vendorSpec() {
  const m = require(VENDOR_SCRIPT);
  assert.ok(Array.isArray(m.FILES) && typeof m.BANNER === 'string',
    'scripts/vendor-sdk-into-mcp.js must export FILES and BANNER so this test cannot drift from it');
  assert.ok(m.BANNER.includes('@generated'), 'the banner must mark vendored files as generated');
  return { files: m.FILES, banner: m.BANNER };
}

// ── the vendor link: pure, hermetic, and where the drift actually was ────────

test('the vendored closure is non-empty and every SDK source it names exists', () => {
  // Non-vacuity for the byte comparison below: if FILES parsed as empty, that test would iterate
  // nothing and pass while the whole vendor tree rotted.
  const { files } = vendorSpec();
  assert.ok(files.length >= 4,
    `expected the vendored closure to name at least 4 files, parsed ${files.length}: ${files.join(', ')}`);
  const missing = files.filter((f) => !fs.existsSync(path.join(SDK_SRC, f)));
  assert.deepStrictEqual(missing, [],
    `the vendoring script names SDK sources that do not exist: ${missing.join(', ')}. It SKIPS a `
    + 'missing source with a warning and still exits 0, so a renamed SDK file would silently drop out '
    + 'of the bundle.');
});

test('every vendored file is BYTE-IDENTICAL to banner + its sdk/src original', () => {
  // The assertion whose absence let the plugin ship a stale SDK. Pure function, so this is exact.
  const { files, banner } = vendorSpec();
  const drifted = [];
  for (const f of files) {
    const want = Buffer.from(banner + fs.readFileSync(path.join(SDK_SRC, f), 'utf8'), 'utf8');
    const have = fs.readFileSync(path.join(VENDOR_DIR, f));
    if (!want.equals(have)) {
      drifted.push(`${f}: vendored ${have.length}B (${sha(have).slice(0, 12)}) vs expected ${want.length}B (${sha(want).slice(0, 12)})`);
    }
  }
  assert.deepStrictEqual(drifted, [],
    `${drifted.length} vendored file(s) differ from sdk/src. Re-vendor, REBUILD, then regenerate:\n`
    + '    node scripts/vendor-sdk-into-mcp.js\n'
    + '    npm --prefix mcp-server run build\n'
    + '    node scripts/build-mindforge-plugin.js\n'
    + `  drifted:\n  ${drifted.join('\n  ')}`);
});

test('requiring the vendoring script performs NO write', () => {
  // The generator in scripts/build-mindforge-plugin.js used to rebuild on import, so a bare require()
  // wiped 526 tracked files. Same hazard here: this script writes four tracked files at module scope.
  // Pinned so a future test or tool can inspect it safely.
  const before = new Map();
  const { files } = vendorSpec();
  for (const f of files) {
    const p = path.join(VENDOR_DIR, f);
    before.set(f, fs.existsSync(p) ? sha(fs.readFileSync(p)) : null);
  }
  const src = fs.readFileSync(VENDOR_SCRIPT, 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // Asserted structurally rather than by actually requiring it: if the guard is absent, requiring
  // would mutate the working tree, and a test that has to cause the damage to detect it is a bad test.
  const writesAtModuleScope = /^\s*fs\.writeFileSync\(/m.test(code) && !/require\.main === module/.test(code);
  assert.ok(!writesAtModuleScope,
    'scripts/vendor-sdk-into-mcp.js writes tracked files at module scope with no require.main guard, '
    + 'so importing it mutates mcp-server/src/vendor/. Wrap the loop in a function called behind '
    + '`if (require.main === module)`.');
  for (const f of files) {
    const p = path.join(VENDOR_DIR, f);
    const now = fs.existsSync(p) ? sha(fs.readFileSync(p)) : null;
    assert.strictEqual(now, before.get(f), `${f} changed while this test ran`);
  }
});

// ── the bundle link: asserted here, enforced in CI ───────────────────────────

test('CI regenerates the vendored SDK and the bundle, then compares BYTES', () => {
  // UNCONDITIONAL, and SCOPED TO THIS ONE STEP. The bundle check needs mcp-server/node_modules, so CI
  // is the only place it can run — which makes this the assertion that the enforcement exists at all.
  //
  // Scoping is load-bearing. A first version matched against every run: line in the workflow and so
  // its `exit 1` assertion was satisfied by an UNRELATED step: replacing this step's `exit 1` with
  // `true` left the suite green. The workflow contains several `exit 1`s, so a whole-file match proves
  // nothing about the step under test — the same mistake as a grep whose own source satisfies it.
  const ci = fs.readFileSync(CI, 'utf8');
  const STEP = 'Shipped MCP bundle must match its source';
  const startIdx = ci.indexOf(STEP);
  assert.ok(startIdx > 0,
    `the CI step "${STEP}" is missing — nothing rebuilds the shipped bundle from source`);
  // The step runs until the next sibling `- name:` at the same indentation.
  const after = ci.slice(startIdx);
  const nextStep = after.search(/\n {6}- name:/);
  const step = nextStep === -1 ? after : after.slice(0, nextStep);

  const stepRunLines = step.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');

  for (const required of [
    'node scripts/vendor-sdk-into-mcp.js',
    'npm --prefix mcp-server run build',
    'node scripts/build-mindforge-plugin.js',
    // THE PATHSPEC, not just the command. Asserting only `git diff --name-only` let a mutation
    // repoint it at a nonexistent path — the comparison still ran, still exited 0, and the suite
    // stayed green while covering nothing. A gate is defined by its scope as much as its verb.
    'git diff --name-only -- mcp-server/src/vendor plugins/mindforge',
    // The PREDICATE, not only the assignment and the exit. Without this line, replacing it with
    // `if false; then` leaves the step green while it checks nothing.
    'if [ -n "$drift" ]; then',
    // Scoped to THIS step, so neutering it cannot be masked by another step's exit.
    'exit 1',
  ]) {
    assert.ok(stepRunLines.includes(required),
      `the "${STEP}" step must execute \`${required}\`. Present elsewhere in the workflow does not `
      + `count — this assertion is scoped to the step. Step body:\n${step.slice(0, 700)}`);
  }
});

test('the tracked plugin bundle matches mcp-server/dist when a local build exists', () => {
  // Corroboration where it is available. mcp-server/dist is gitignored, so on a runner or a fresh
  // clone there is nothing to compare — and this is deliberately NOT the only bundle assertion, so
  // its absence cannot make the file vacuous. The unconditional CI-wiring test above is what holds.
  if (!fs.existsSync(MCP_DIST)) {
    assert.ok(fs.existsSync(PLUGIN_BUNDLE),
      'the tracked plugin bundle must exist even when no local build is present');
    return;
  }
  assert.strictEqual(sha(fs.readFileSync(PLUGIN_BUNDLE)), sha(fs.readFileSync(MCP_DIST)),
    'plugins/mindforge/mcp/dist/index.js differs from the locally built mcp-server/dist/index.js.\n'
    // THE REMEDIATION NAMES THE REBUILD FIRST, DELIBERATELY. Advising only
    // `node scripts/build-mindforge-plugin.js` is actively dangerous here: the likeliest reason this
    // assertion fires is a STALE leftover mcp-server/dist, and regenerating the plugin copies that
    // stale dist OVER the correct tracked bundle — committing the exact drift this file exists to
    // prevent. Rebuild, then regenerate.
    + '  Re-vendor and REBUILD before regenerating, or a stale local dist overwrites a correct bundle:\n'
    + '    node scripts/vendor-sdk-into-mcp.js\n'
    + '    npm --prefix mcp-server run build\n'
    + '    node scripts/build-mindforge-plugin.js');
});

test('the tracked bundle is mode 0644, matching what the build emits', () => {
  // Not cosmetic — it is what makes the CI gate usable. esbuild writes 0644; the bundle was committed
  // 0755. Had the mode been preserved, CI's regenerate-and-compare would report drift on EVERY run
  // (`mode change 100755 => 100644`) and the gate would be permanently red, which is indistinguishable
  // from a gate everyone learns to ignore. The exec bit is irrelevant to function: plugins/mindforge/
  // .mcp.json launches the bundle with "command": "node", never by execing the file.
  // Reads the mode GIT RECORDS, not the working tree's. The working-tree bit varies with umask and
  // with how a file was copied, and CI checks out what git recorded — so a statSync() version of this
  // test reported 755 inside a fresh clone purely because the clone predated the mode change.
  const r = spawnSync('git', ['ls-files', '-s', '--', 'plugins/mindforge/mcp/dist/index.js'],
    { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, 'git ls-files must succeed');
  const recorded = (r.stdout || '').trim().split(/\s+/)[0];
  assert.strictEqual(recorded, '100644',
    `git records the bundle as ${recorded}; the build emits 100644, so any other mode makes the CI `
    + 'drift comparison report `mode change` on every run');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nVendored Artifact Integrity: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
