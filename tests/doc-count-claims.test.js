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

// ── Every CLI invocation a doc prints must actually run ───────────────────────
//
// The sibling gate above covers `/mindforge:` SLASH commands. This one covers the OTHER command
// surface the docs use — `mindforge <verb>`, `node bin/mindforge-cli.js <verb>`,
// `npx mindforge-cc <verb>` — which nothing checked. Written before the fixes, so the violations were
// enumerated by measurement rather than recalled; it found five, including one a 14-agent audit of the
// same surface had missed (`validate-config`, which turned out to be correctly documented as NOT a
// subcommand — see the heading rule below).
//
// THE DEFECT it caught, verified by running each:
//   docs/troubleshooting.md + docs/upgrade.md ×3   `npx mindforge-cc@latest install`
//       Measured: exit 1, "Unknown argument: install — mindforge-cc takes flags only". The upgrade
//       remedy in the troubleshooting guide could not be followed.
//   CLAUDE.md                                      `node bin/mindforge-cli.js dashboard` — exits 1
//   .mindforge/engine/autonomous/headless-adapter.md  `npx mindforge auto` in a "Typical GitHub Action
//       setup" — `auto` is a slash command, never a CLI verb. Repointed to `headless`, which routes.
//   .claude/commands/mindforge/{browse,qa}.md + their .agent mirrors — advertised `@mindforge <verb>`,
//       a syntax that exists nowhere: 2 of 221 command files used it, the convention is
//       `/mindforge:<name>`, and no code references it.
//
// SCOPE, and every exclusion is a reason rather than an omission:
//   - ALL TRACKED .md/.js, not just shipped. docs/upgrade.md is unshipped yet holds 3 of the 5
//     violations, and people read it on GitHub. The slash-command gate above scopes to shipped
//     deliberately; that argument does not transfer, because a broken shell command is followable from
//     a web page.
//   - changelogs/ and RELEASENOTES: frozen historical records. Same exclusion, same reason as above.
//   - docs/research/**: v12 PROPOSALS. They describe `mindforge doctor`, `mindforge skills add`,
//     `mindforge context --disable` and `mindforge verify-audit` as things to BUILD. Forward-looking
//     design is the mirror image of a historical record and equally wrong to rewrite.
//   - MARKDOWN HEADINGS. `## \`node bin/mindforge-cli.js validate-config\` prints "Unknown command"` is
//     a troubleshooting entry ABOUT a verb not existing, and its body says so correctly. A heading
//     names a topic; only body text instructs. Excluding headings is what makes this gate need no
//     allowlist — and an allowlist is what went stale in tests/protocol-claims.test.js's predecessor.
//   - CODE CONTEXTS ONLY (inline spans and fenced blocks), and the bare `mindforge <verb>` form must
//     START its span. Without the anchor, `marketplace mindforge entry (…)` inside an assertion
//     message in this very suite matched, reporting the verb "entry".
//
// The verb set is DERIVED FROM SOURCE, never listed here: COMMANDS keys plus every inline
// `COMMAND === '<verb>'` handler. `workflow` is exactly that second kind — routable, no table entry —
// so a hardcoded list would have reported the project's most-documented working verb as broken.

test('every CLI invocation printed in a doc names a verb the router will dispatch', () => {
  const { execFileSync } = require('child_process');
  const cliSrc = read('bin/mindforge-cli.js');
  const tableStart = cliSrc.indexOf('const COMMANDS = {');
  assert.ok(tableStart > 0, 'could not locate the COMMANDS table — this gate would cover nothing');
  const table = cliSrc.slice(tableStart, cliSrc.indexOf('\n};', tableStart));

  const verbs = new Set([...table.matchAll(/^ {2}'([a-z][a-z0-9-]*)':/gm)].map((m) => m[1]));
  // Verbs handled inline, before the table lookup. Derived, not listed, so adding one cannot silently
  // make this gate wrong in the direction of a false failure.
  for (const m of cliSrc.matchAll(/COMMAND === '([a-z][a-z0-9-]*)'/g)) verbs.add(m[1]);
  const flags = new Set(['version', 'V', 'help', 'h', 'verbose', 'v']);

  // NON-VACUITY on the verb set: too few and everything looks broken, too many and nothing does.
  assert.ok(verbs.size >= 20 && verbs.size <= 60,
    `derived ${verbs.size} routable verbs, which is implausible — the COMMANDS table shape changed and `
    + 'this gate is no longer measuring what it claims');
  assert.ok(verbs.has('workflow'),
    'the inline-handler scan found no `workflow` verb. It is routed at bin/mindforge-cli.js and is the '
    + 'most-documented verb in the project, so losing it means this gate would flag correct docs');

  const tracked = execFileSync('git', ['ls-files', '*.md', '*.js'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('changelogs/') && !/^RELEASENOTES/.test(f))
    .filter((f) => !f.includes('node_modules/'))
    .filter((f) => !f.startsWith('docs/research/'));

  // NON-VACUITY on the corpus: an empty list would pass silently.
  assert.ok(tracked.length >= 500,
    `only ${tracked.length} tracked .md/.js file(s) found — git ls-files output shape changed, so this `
    + 'check would cover almost nothing');

  const PROSE = /^(?:is|are|and|the|to|for|with|as|a|an|in|on|of|it|its|has|was|does|will|can|from|by|npm|run|test|init|v\d.*)$/;
  const PATTERNS = [
    /\bnpx\s+mindforge-cc(?:@[\w.-]+)?\s+([a-z][a-z0-9-]*)/g,
    /\bnode\s+\S*bin\/mindforge-cli\.js\s+([a-z][a-z0-9-]*)/g,
    /^\s*(?:\$\s*)?mindforge\s+([a-z][a-z0-9-]*)/g,
  ];

  const broken = [];
  for (const rel of tracked) {
    const full = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const isJs = rel.endsWith('.js');
    let fenced = false;
    read(rel).split('\n').forEach((line, i) => {
      if (/^\s*```/.test(line)) { fenced = !fenced; return; }
      if (!fenced && /^\s{0,3}#{1,6}\s/.test(line)) return;      // a heading names a topic, not an action
      // In .js, a COMMENT describes code; a STRING LITERAL instructs. The sibling gate scans .js
      // precisely because shipped hooks inject the strings they PRINT into the agent's context — that
      // text lives in literals, never in comments. Without this, the very block above documenting the
      // five invocations this gate caught made the gate fail on itself, which is not an allowlist
      // problem but a category error: a record of a past defect is not an instruction to repeat it.
      // Same reasoning as the heading rule, and as excluding changelogs/.
      if (isJs && /^\s*(?:\/\/|\/\*|\*)/.test(line)) return;
      const spans = fenced ? [line] : [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      for (const span of spans) {
        for (const pattern of PATTERNS) {
          for (const m of span.matchAll(pattern)) {
            const verb = m[1];
            if (verbs.has(verb) || flags.has(verb) || PROSE.test(verb)) continue;
            broken.push(`${rel}:${i + 1}  '${verb}'  in: ${span.trim().slice(0, 70)}`);
          }
        }
      }
    });
  }
  assert.deepStrictEqual([...new Set(broken)], [],
    `${new Set(broken).size} documented CLI invocation(s) name a verb the router will not dispatch:\n  `
    + `${[...new Set(broken)].join('\n  ')}\n`
    + 'Run it before documenting it. Name a routable verb, the real script path, or the slash command.');
});

test('no doc advertises the @mindforge invocation form, which does not exist', () => {
  // Two of 221 command files (browse, qa) declared `@mindforge <verb>` in BOTH their frontmatter
  // `description` and their Usage line. It is not a real syntax: the convention is `/mindforge:<name>`
  // (38 Usage lines use it), and the only `@mindforge` tokens in code are unrelated — a plugin spec
  // (`mindforge@mindforge`) and `@mindforge/sdk`, itself a documented never-published defect.
  //
  // Kept separate from the gate above because the defect is the FORM, not the verb: `browse` and `qa`
  // are real slash commands. The gate above happened to flag them for the wrong reason (they are not
  // CLI verbs), so relying on it would have been a green-for-the-wrong-reason result.
  const { execFileSync } = require('child_process');
  const tracked = execFileSync('git', ['ls-files', '*.md'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('changelogs/') && !/^RELEASENOTES/.test(f) && !f.includes('node_modules/'));
  assert.ok(tracked.length >= 500,
    `only ${tracked.length} tracked .md file(s) — this check would cover almost nothing`);

  const offenders = [];
  for (const rel of tracked) {
    if (!fs.existsSync(path.join(REPO_ROOT, rel))) continue;
    read(rel).split('\n').forEach((line, i) => {
      // `@mindforge` followed by a space and a word is the invocation shape. `mindforge@mindforge`
      // (a plugin marketplace spec) and `@mindforge/sdk` (a package name) are deliberately not matched.
      if (/(?:^|[^\w/@-])@mindforge\s+[a-z]/.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 70)}`);
    });
  }
  assert.deepStrictEqual(offenders, [],
    `${offenders.length} line(s) advertise the @mindforge form, which invokes nothing:\n  `
    + `${offenders.join('\n  ')}\n`
    + 'Use `/mindforge:<name>` for a slash command, or the CLI form for a CLI verb.');
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
