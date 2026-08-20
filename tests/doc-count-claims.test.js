/**
 * Every number stated in prose must match what the repo actually contains.
 *
 * WHY THIS EXISTS. An audit of unfalsifiable instruments named this as a standing theme:
 *
 *     "Every count in prose is hand-maintained. README files[], AGENTS.md inventories,
 *      docs/faq.md coverage, marketplace.json subagent counts — no generator, no assertion,
 *      four independent drifts."
 *
 * Measured drifts at the time this file was written:
 *
 *     AGENTS.md          v11.9.0            actual 11.9.2
 *     AGENTS.md          72 *.test.js       actual 116        (off by 44)
 *     AGENTS.md          6 hooks            actual 9
 *     AGENTS.md          ~130 workflows     actual 221
 *     AGENTS.md          ~200 skills        actual 232
 *     docs/faq.md        95/97 tests        actual 116 files, 114 pass, 2 skip
 *     README.md          files[] has 47     actual 48
 *     subagents marketplace  154 subagents  actual 164
 *
 * Correcting them without an assertion just resets a clock. Each entry below therefore LOCATES the
 * claim with a regex and MEASURES the truth independently, so a drift fails here rather than in a
 * reader's head.
 *
 * If a claim is reworded so its regex no longer matches, this test fails on purpose: silently
 * covering nothing is the failure mode being removed, so an unmatched pattern must be loud. Fix the
 * regex deliberately, or drop the claim.
 *
 * THE FRICTION IS THE POINT, and it is a real cost worth naming: adding a test file now requires
 * updating two prose counts, and this test told me so immediately — the first run failed at
 * 116 vs 117 because THIS file had just become the 117th. The alternative, an approximation like
 * "~200 skills", is precisely what drifted to 232 unnoticed. So the trade is: state an exact number
 * and let CI keep it true, or state none at all. Do not state an approximate one.
 *
 * NOTE ON WHAT IS DELIBERATELY NOT PINNED. docs/faq.md no longer states a coverage percentage. c8
 * cannot run on Node 26 locally (yargs throws "require is not defined in ES module scope"), so any
 * figure written here would be unverifiable by the person maintaining it — which is exactly how
 * "~66%" survived. The faq now cites the enforced FLOOR, which this file does pin against the
 * workflow, and points at the CI job for the measured value.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** Count tracked files matching a predicate, via git so untracked scratch files never inflate it. */
function trackedCount(predicate) {
  return execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean).filter(predicate).length;
}

// ── Measurements, each computed rather than restated ─────────────────────────

const MEASURED = {
  version: () => readJson('package.json').version,
  filesEntries: () => readJson('package.json').files.length,
  testFiles: () => require(path.join(REPO_ROOT, 'tests', 'run-all.js')).discoverTests().length,
  skippedTests: () => {
    const { discoverTests, getSkipReason } = require(path.join(REPO_ROOT, 'tests', 'run-all.js'));
    return discoverTests().filter((f) => getSkipReason(path.join(REPO_ROOT, 'tests', f))).length;
  },
  agentHookScripts: () => trackedCount((f) => /^\.agent\/hooks\/[^/]+\.js$/.test(f)),
  registeredHooks: () => {
    const s = readJson('.claude/settings.json').hooks || {};
    let n = 0;
    for (const groups of Object.values(s)) for (const g of groups || []) n += (g.hooks || []).length;
    return n;
  },
  agentWorkflows: () => trackedCount((f) => f.startsWith('.agent/mindforge/') && f.endsWith('.md')),
  engineSkills: () => trackedCount((f) => /^\.mindforge\/skills\/[^/]+\/SKILL\.md$/.test(f)),
  subagents: () => trackedCount((f) => f.startsWith('subagents/categories/') && f.endsWith('.md') && !f.endsWith('README.md')),
  coverageFloor: () => {
    const ci = read('.github/workflows/mindforge-ci.yml');
    const m = ci.match(/--check-coverage\s+--lines\s+(\d+)/);
    assert.ok(m, 'mindforge-ci.yml must still gate coverage with --check-coverage --lines N');
    return Number(m[1]);
  },
};

/**
 * Each claim: where it lives, a regex whose FIRST capture group is the stated number, and the
 * measurement it must equal.
 */
const CLAIMS = [
  { file: 'AGENTS.md', what: 'version', re: /MindForge v(\d+\.\d+\.\d+) is an agentic/, expect: () => MEASURED.version(), numeric: false },
  { file: 'AGENTS.md', what: 'test file count', re: /`tests\/` \((\d+) `\*\.test\.js`\)/, expect: () => MEASURED.testFiles() },
  { file: 'AGENTS.md', what: 'hook script count', re: /`\.agent\/` \((\d+) hooks/, expect: () => MEASURED.agentHookScripts() },
  { file: 'AGENTS.md', what: 'registered hook count', re: /(\d+) registered/, expect: () => MEASURED.registeredHooks() },
  { file: 'AGENTS.md', what: 'workflow count', re: /(\d+) workflows/, expect: () => MEASURED.agentWorkflows() },
  { file: 'AGENTS.md', what: 'engine skill count', re: /engine configs, (\d+) skills/, expect: () => MEASURED.engineSkills() },
  { file: 'README.md', what: 'files[] entry count', re: /`files\[\]` has (\d+)\s*\n?\s*entries/, expect: () => MEASURED.filesEntries() },
  { file: 'docs/faq.md', what: 'test file count', re: /(\d+) test files:/, expect: () => MEASURED.testFiles() },
  { file: 'docs/faq.md', what: 'passing test count', re: /test files: (\d+) pass/, expect: () => MEASURED.testFiles() - MEASURED.skippedTests() },
  { file: 'docs/faq.md', what: 'skip count', re: /(\d+) env-dependent skips/, expect: () => MEASURED.skippedTests() },
  { file: 'docs/faq.md', what: 'coverage floor', re: /enforced floor is \*\*(\d+)% lines\*\*/, expect: () => MEASURED.coverageFloor() },
  // CLAUDE.md states the same three numbers as docs/faq.md and was NOT covered here, so it drifted
  // to "111 files today: 109 pass" against a real 132/130 — a 21-file gap, in the one document every
  // contributor and every agent session reads first. An ungated count does not stay right; these
  // three entries are the whole reason the other nine exist.
  { file: 'CLAUDE.md', what: 'test file count', re: /\*\*(\d+) files today:/, expect: () => MEASURED.testFiles() },
  { file: 'CLAUDE.md', what: 'passing test count', re: /files today: (\d+) pass/, expect: () => MEASURED.testFiles() - MEASURED.skippedTests() },
  { file: 'CLAUDE.md', what: 'skip count', re: /pass, (\d+) env-dependent skips/, expect: () => MEASURED.skippedTests() },
  { file: 'subagents/.claude-plugin/marketplace.json', what: 'subagent count', re: /collection of (\d+) specialized/, expect: () => MEASURED.subagents() },
];

// ── Every /mindforge: command a SHIPPED doc names must exist ──────────────────
//
// THE DEFECT. The shipped docs advertised 15 slash commands that exist in neither harness root:
// autonomous, brainstorming, history, join-discord, neural-orchestrator, parallel-mesh, personas,
// pr-branch, settings, skill-creation, swarm-execution, tdd, temporal, verify-work and
// workspace-isolated. A reader following docs/user-guide.md typed `/mindforge:personas --list` and
// got nothing.
//
// They were not typos. `.agent/workflows/` holds 130 tracked files using those exact names — the OLD
// Antigravity target layout, committed and then orphaned. It ships ZERO files (verified against
// `npm pack --dry-run`), the installer's command sources are `.agent/mindforge` and `.agent/forge`,
// and no code references it. The docs were written against a layout that no longer reaches anyone.
//
// SCOPED TO WHAT SHIPS, deliberately. docs/PERSONAS.md, docs/tutorial.md and docs/registry/* carry
// more of these names and ship no files, so a user cannot be misled by them. Widening this gate to
// unshipped docs would trade real coverage for a larger number.
//
// The dispositions were not guesses. Each phantom was checked against the real command set, the CLI
// table and the engine specs before being renamed, repointed or removed — and two initial choices
// were corrected by that check: `/mindforge:workspace` does not document `--cleanup`, so the flag was
// dropped rather than carried over; and `pr-branch` -> `pr-review` was rejected as a semantic
// mismatch (creating a branch versus reviewing a diff) in favour of plain git.

test('no shipped doc names a /mindforge: command that does not exist', () => {
  const { execFileSync } = require('child_process');
  const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }));
  const shipped = packed[0].files
    .map((f) => f.path)
    // .js AS WELL AS .md, and the .js half is the more urgent of the two. Shipped hooks INJECT their
    // text straight into the agent's context at runtime, so a phantom there is not a doc a user might
    // read — it is an instruction the model receives and acts on. Applying this gate's own logic to
    // the 233 shipped .js files surfaced three live ones: /mindforge:pause-work in
    // .agent/hooks/mindforge-context-monitor.js and /mindforge:fast twice in
    // .agent/hooks/mindforge-workflow-guard.js. Both repointed to commands that exist
    // (/mindforge:checkpoint and /mindforge:do), after checking that the replacement fits what the
    // surrounding message actually says — the first attempt suggested /mindforge:handoff in a message
    // whose next clause is "Do NOT write handoff files".
    .filter((f) => /\.(md|js)$/.test(f))
    // changelogs/ and RELEASENOTES are HISTORICAL RECORDS. changelogs/v2.6.0.md names
    // /mindforge:temporal because that is what v2.6.0 shipped with; rewriting it would falsify the
    // record to satisfy a present-tense check. Same exclusion the audit-terminology sweep used, and
    // for the same reason. Everything a reader would act on TODAY is still in scope.
    .filter((f) => !f.startsWith('changelogs/') && !/^RELEASENOTES/.test(f));

  // NON-VACUITY: if the pack output shape changed, an empty list would pass silently.
  assert.ok(shipped.length >= 5,
    `only ${shipped.length} shipped .md file(s) found — npm pack --dry-run --json shape changed, so `
    + 'this check would cover nothing');

  const commandDir = path.join(REPO_ROOT, '.claude', 'commands', 'mindforge');
  const mirrorDir = path.join(REPO_ROOT, '.agent', 'mindforge');
  const exists = (n) => fs.existsSync(path.join(commandDir, `${n}.md`))
    || fs.existsSync(path.join(mirrorDir, `${n}.md`));

  const broken = [];
  for (const rel of shipped) {
    const full = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/\/mindforge:([a-z][a-z0-9-]*)/g)) {
        // `wf-` is a documented template placeholder (/mindforge:wf-<name>), not a command name.
        if (m[1] === 'wf' || m[1].startsWith('wf-')) continue;
        if (!exists(m[1])) broken.push(`${rel}:${i + 1}  /mindforge:${m[1]}`);
      }
    });
  }
  assert.deepStrictEqual(broken, [],
    `${broken.length} reference(s) in SHIPPED docs name a command no harness provides:\n  `
    + `${broken.join('\n  ')}\n`
    + 'Every consumer receives these files. Name a real command, name the CLI form, or describe the '
    + 'capability where it actually lives.');
});

for (const claim of CLAIMS) {
  test(`${claim.file}: ${claim.what} matches reality`, () => {
    const text = read(claim.file);
    const m = text.match(claim.re);
    assert.ok(m, `${claim.file}: the ${claim.what} claim no longer matches ${claim.re}. If the ` +
      'wording changed, update the pattern deliberately — an unmatched pattern silently covers ' +
      'nothing, which is the failure mode this file exists to remove.');
    const stated = claim.numeric === false ? m[1] : Number(m[1]);
    const actual = claim.expect();
    assert.strictEqual(stated, actual,
      `${claim.file} states ${claim.what} = ${stated}, measured ${actual}`);
  });
}

// ── The root marketplace's own counts, pinned in the same place ──────────────

test('.claude-plugin/marketplace.json mindforge description counts match the plugin tree', () => {
  // Corrected in an earlier pass (was 174/154/74). Pinned here so every prose count in the repo
  // has one home, rather than each being remembered separately.
  const entry = readJson('.claude-plugin/marketplace.json').plugins.find((p) => p.name === 'mindforge');
  assert.ok(entry, 'the mindforge plugin entry must exist');
  const m = entry.description.match(/(\d+) commands, (\d+) subagents, (\d+) skills/);
  assert.ok(m, `the description must state commands/subagents/skills counts, got: ${entry.description}`);
  const measured = {
    commands: trackedCount((f) => f.startsWith('plugins/mindforge/commands/') && f.endsWith('.md')),
    agents: trackedCount((f) => f.startsWith('plugins/mindforge/agents/') && f.endsWith('.md')),
    skills: trackedCount((f) => /^plugins\/mindforge\/skills\/.*SKILL\.md$/.test(f)),
  };
  assert.strictEqual(Number(m[1]), measured.commands, `commands: stated ${m[1]}, measured ${measured.commands}`);
  assert.strictEqual(Number(m[2]), measured.agents, `subagents: stated ${m[2]}, measured ${measured.agents}`);
  assert.strictEqual(Number(m[3]), measured.skills, `skills: stated ${m[3]}, measured ${measured.skills}`);
});

// ── The measurements themselves must be non-trivial ─────────────────────────

test('every measurement returns a plausible non-zero value', () => {
  // Guards the guard. If a measurement silently returned 0 — a moved directory, a changed glob —
  // then a doc claiming 0 would "match" and every assertion above would pass while proving
  // nothing. This is the same shape as the vacuous 0/0 category assertion caught earlier today.
  for (const [name, fn] of Object.entries(MEASURED)) {
    const v = fn();
    if (name === 'version') {
      assert.match(v, /^\d+\.\d+\.\d+/, `version measurement looks wrong: ${v}`);
      continue;
    }
    assert.ok(typeof v === 'number' && v > 0,
      `measurement ${name} returned ${v} — a zero or non-numeric measurement would make the ` +
      'claims above vacuously satisfiable');
  }
  // And the counts must be in the right ballpark, so a glob matching one stray file cannot pass.
  assert.ok(MEASURED.testFiles() > 50, `testFiles measured ${MEASURED.testFiles()}, expected >50`);
  assert.ok(MEASURED.subagents() > 100, `subagents measured ${MEASURED.subagents()}, expected >100`);
  assert.ok(MEASURED.engineSkills() > 100, `engineSkills measured ${MEASURED.engineSkills()}, expected >100`);
});

test('no doc still carries a coverage PERCENTAGE nobody can verify locally', () => {
  // "~66%" survived because c8 cannot run on Node 26 here (yargs: "require is not defined in ES
  // module scope"), so the maintainer could not check it. A floor pinned against the workflow is
  // verifiable; a remembered percentage is not.
  const faq = read('docs/faq.md');
  const section = faq.slice(faq.indexOf('What is the test coverage?'));
  const answer = section.slice(0, section.indexOf('\n**Q:') === -1 ? 1200 : section.indexOf('\n**Q:'));
  const pct = answer.match(/~\s*\d+%|\b\d+% coverage/);
  assert.strictEqual(pct, null,
    `docs/faq.md's coverage answer states an unverifiable percentage (${pct && pct[0]}). Cite the ` +
    'enforced floor and the CI job instead — the measured number belongs where it is measured.');
});

(async () => {
  const registeredBeforeRun = tests.length;
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  if (tests.length !== registeredBeforeRun) {
    console.error(`  ❌  ${tests.length - registeredBeforeRun} test(s) registered after the runner and never ran`);
    failed++;
  }
  console.log(`\nDoc Count Claims: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
