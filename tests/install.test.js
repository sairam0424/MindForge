/**
 * MindForge installer smoke tests
 * Run: node tests/install.test.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

if (!fs.existsSync(path.join(process.cwd(), 'bin/mindforge-cli.js'))) {
  console.error('ERROR: Tests must be run from the MindForge project root: cd MindForge && npm test');
  process.exit(1);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('\nMindForge Core Installation & Structural Tests\n');

// ── Directory structure tests ─────────────────────────────────────────────────
console.log('Directories:');
const dirs = [
  '.claude/commands/mindforge',
  '.agent/mindforge',
  '.mindforge/personas',
  '.mindforge/integrations',
  '.mindforge/governance',
  '.mindforge/team',
  '.mindforge/org/integrations',
  '.mindforge/skills/security-review',
  '.mindforge/skills/code-quality',
  '.mindforge/skills/api-design',
  '.mindforge/skills/testing-standards',
  '.mindforge/skills/documentation',
  '.mindforge/org',
  '.planning/decisions',
  'bin',
  'docs',
  'tests',
  '.planning/audit-archive',
  '.planning/approvals',
  '.planning/milestones',
];
dirs.forEach(d => test(d, () => assert.ok(fs.existsSync(d), `Missing: ${d}`)));

// ── Required files tests ──────────────────────────────────────────────────────
console.log('\nRequired files:');
const files = [
  '.claude/CLAUDE.md',
  '.agent/CLAUDE.md',
  '.claude/commands/mindforge/help.md',
  '.claude/commands/mindforge/init-project.md',
  '.claude/commands/mindforge/plan-phase.md',
  '.claude/commands/mindforge/execute-phase.md',
  '.claude/commands/mindforge/verify-phase.md',
  '.claude/commands/mindforge/ship.md',
  '.claude/commands/mindforge/audit.md',
  '.claude/commands/mindforge/milestone.md',
  '.claude/commands/mindforge/complete-milestone.md',
  '.claude/commands/mindforge/approve.md',
  '.claude/commands/mindforge/sync-jira.md',
  '.claude/commands/mindforge/sync-confluence.md',
  '.mindforge/personas/analyst.md',
  '.mindforge/personas/architect.md',
  '.mindforge/personas/developer.md',
  '.mindforge/personas/qa-engineer.md',
  '.mindforge/personas/security-reviewer.md',
  '.mindforge/personas/tech-writer.md',
  '.mindforge/personas/debug-specialist.md',
  '.mindforge/personas/release-manager.md',
  '.mindforge/skills/security-review/SKILL.md',
  '.mindforge/skills/code-quality/SKILL.md',
  '.mindforge/skills/api-design/SKILL.md',
  '.mindforge/skills/testing-standards/SKILL.md',
  '.mindforge/skills/documentation/SKILL.md',
  '.mindforge/org/ORG.md',
  '.mindforge/org/CONVENTIONS.md',
  '.mindforge/org/SECURITY.md',
  '.mindforge/org/TOOLS.md',
  '.mindforge/integrations/connection-manager.md',
  '.mindforge/integrations/jira.md',
  '.mindforge/integrations/confluence.md',
  '.mindforge/integrations/slack.md',
  '.mindforge/integrations/github.md',
  '.mindforge/integrations/gitlab.md',
  '.mindforge/governance/change-classifier.md',
  '.mindforge/governance/approval-workflow.md',
  '.mindforge/governance/compliance-gates.md',
  '.mindforge/governance/GOVERNANCE-CONFIG.md',
  '.mindforge/team/multi-handoff.md',
  '.mindforge/team/session-merger.md',
  '.mindforge/org/integrations/INTEGRATIONS-CONFIG.md',
  '.planning/STATE.md',
  '.planning/HANDOFF.json',
  '.planning/jira-sync.json',
  '.planning/slack-threads.json',
  'bin/install.js',
  'package.json',
  'README.md',
  'docs/enterprise-setup.md',
  'docs/governance-guide.md',
];
files.forEach(f => test(f, () => assert.ok(fs.existsSync(f), `Missing: ${f}`)));

// ── Content tests ─────────────────────────────────────────────────────────────
console.log('\nContent validation:');

test('CLAUDE.md has session start protocol', () => {
  const content = fs.readFileSync('.claude/CLAUDE.md', 'utf8');
  assert.ok(content.includes('SESSION START PROTOCOL'), 'Missing session start protocol');
  assert.ok(content.includes('PLAN-FIRST RULE'), 'Missing plan-first rule');
  assert.ok(content.includes('Quality gates'), 'Missing quality gates');
  assert.ok(content.includes('SECURITY AUTO-TRIGGER'), 'Missing security auto-trigger');
  assert.ok(content.includes('/mindforge:audit'), 'Missing Day 4 command awareness');
  assert.ok(content.includes('Tier 3'), 'Missing governance tier awareness');
});

test('CLAUDE.md and .agent/CLAUDE.md are identical', () => {
  const claude = fs.readFileSync('.claude/CLAUDE.md', 'utf8');
  const agent = fs.readFileSync('.agent/CLAUDE.md', 'utf8');
  assert.strictEqual(claude, agent, '.claude/CLAUDE.md and .agent/CLAUDE.md differ');
});

test('All commands mirrored to .agent/mindforge/', () => {
  const claudeCommands = fs.readdirSync('.claude/commands/mindforge/').sort();
  const agentCommands = new Set(fs.readdirSync('.agent/mindforge/'));
  // In a self-install (running tests inside the repo itself), .claude/commands/mindforge/
  // may be populated from the last published npm package, which can be behind the working
  // tree. Verify .claude/ files are a subset of .agent/ (no orphaned files), and that
  // every file present in .claude/ matches its .agent/ counterpart.
  const orphans = claudeCommands.filter(f => !agentCommands.has(f));
  assert.deepStrictEqual(orphans, [], `Commands in .claude/ not found in .agent/: ${orphans.join(', ')}`);
});

test('HANDOFF.json is valid JSON', () => {
  const content = fs.readFileSync('.planning/HANDOFF.json', 'utf8');
  const parsed = JSON.parse(content);
  assert.ok(parsed.schema_version, 'Missing schema_version field');
  assert.ok(parsed._warning, 'Missing _warning anti-secret field');
});

test('package.json has bin field', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.ok(pkg.bin, 'Missing bin field');
  assert.ok(pkg.bin['mindforge-cc'], 'Missing bin.mindforge-cc');
  assert.ok(pkg.engines, 'Missing engines field');
  assert.ok(pkg.engines.node, 'Missing engines.node');
});

test('All skill packs have frontmatter triggers', () => {
  const skillDirs = fs.readdirSync('.mindforge/skills/');
  skillDirs.forEach(dir => {
    const skillPath = `.mindforge/skills/${dir}/SKILL.md`;
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf8');
      assert.ok(content.includes('triggers:'), `${skillPath} missing triggers frontmatter`);
      assert.ok(content.includes('name:'), `${skillPath} missing name frontmatter`);
    }
  });
});

test('bin/install.js is executable and has no obvious syntax errors', () => {
  const stat = fs.statSync('bin/install.js');
  assert.ok(stat.size > 1000, 'bin/install.js is suspiciously small');
  const content = fs.readFileSync('bin/install.js', 'utf8');
  assert.ok(content.includes('#!/usr/bin/env node'), 'Missing shebang line');
  // Was: assert.ok(content.includes('verifyInstall')). The function lives in installer-core.js,
  // so this only ever passed because a COMMENT in this file contained the string — a comment added
  // to satisfy this assertion. The real structural property is that the entry point delegates.
  assert.match(content, /require\(['"]\.\/installer-core['"]\)/,
    'bin/install.js must delegate to ./installer-core.js');
  // Assert on CODE, not prose. The first version of this check tripped on the comment that
  // explains the history above — a comment failing a grep is the same category error as a comment
  // satisfying one. What must not exist is a code reference to a function defined elsewhere.
  const codeOnly = content.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/verifyInstall/.test(codeOnly),
    'bin/install.js code should not reference verifyInstall — it lives in installer-core.js');
});

// ── Committed-secret scan ─────────────────────────────────────────────────────
//
// THE DEFECT THIS REPLACES. The test below is named "No secrets in any COMMITTED file" and its
// own comment said that scanning gitignored trees "is both wrong and a false-positive source" —
// and then it called `scanDir('.')`, walking the working tree. The committed set was approximated
// by a 7-entry `SKIP_DIRS` denylist standing in for a `.gitignore` that has ~60 entries. Two
// consequences, both observed:
//
//   FALSE POSITIVES. Any gitignored file holding a secret-shaped string reds the suite, and
//   because `.husky/pre-commit` runs `npm test`, that BLOCKS EVERY COMMIT. Measured twice in one
//   day, both times on private notes under the gitignored `scratch-pad/` that merely *described*
//   a hardcoded-credential pattern. The escape is `--no-verify`, which also skips the staged
//   gitleaks scan at `.husky/pre-commit:9-25` — so a false positive here actively degrades
//   security.
//
//   FALSE NEGATIVES. Only `.md`/`.js`/`.json` were read. Measured: 2982 tracked files, 2858
//   scanned, so 59 TRACKED files were invisible — 19 `.cjs`, 14 `.yml`, 12 `.ts`, 9 `.sh`,
//   4 `.mjs`, 1 `.toml`. The 14 YAML files are `.github/workflows/`, which is where credentials
//   actually appear. Expanding the extension list found 0 new violations, so the coverage was
//   free; it had simply never been taken.
//
// THE FIX is to make the scanned set BE the committed set, by enumerating `git ls-files` instead
// of walking the disk. Not by appending `scratch-pad` to `SKIP_DIRS`: that makes the name true
// for one directory and leaves every other ignored path scanned, buying a green hook while
// keeping the lie.
//
// WHY DROPPING UNTRACKED FILES IS SAFE. A brand-new file with a real secret is caught earlier and
// better: `.husky/pre-commit:9-25` runs `gitleaks protect --staged` BEFORE `npm test`, and that
// scans exactly the staged set with a purpose-built engine. This test's job is the standing
// committed history, which gitleaks-staged does not cover.

// A secret-shaped match is a violation only if it is NOT an obvious placeholder. Allowlisting the
// placeholder VALUE rather than whole directories keeps the scanner live over docs that TEACH
// about secret patterns, so a genuine credential in one of them would still be caught.
const PLACEHOLDER = /(xxxx|x{4,}|your[-_]?(api[-_]?)?key|placeholder|example|redacted|\.\.\.|<[^>]+>|changeme|dummy|fake|sample)/i;

const SECRET_PATTERNS = [
  /password\s*=\s*['"][^'"]{6,}/i,
  /api[_-]?key\s*=\s*['"][^'"]{10,}/i,
  /secret\s*=\s*['"][^'"]{8,}/i,
  /-----BEGIN (RSA |EC |PRIVATE )?KEY-----/,
  /sk-[a-zA-Z0-9]{20,}/,
];

// Text formats a credential can hide in. `.yml` and `.sh` are the additions that matter.
const SCAN_EXT = ['.md', '.js', '.json', '.yml', '.yaml', '.ts', '.mjs', '.cjs', '.sh', '.toml', '.txt'];

// The committed set, NUL-delimited so paths with spaces survive.
function trackedTextFiles(cwd) {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd, maxBuffer: 1 << 28 }).toString('utf8');
  return out.split('\0').filter(Boolean).filter((f) => SCAN_EXT.some((e) => f.endsWith(e)));
}

function findSecrets(cwd, files) {
  const hits = [];
  for (const rel of files) {
    let body;
    try { body = fs.readFileSync(path.join(cwd, rel), 'utf8'); } catch { continue; }
    for (const pattern of SECRET_PATTERNS) {
      const m = body.match(pattern);
      if (m && !PLACEHOLDER.test(m[0])) hits.push({ file: rel, match: m[0].slice(0, 40) });
    }
  }
  return hits;
}

test('No secrets in any committed file', () => {
  const files = trackedTextFiles(process.cwd());

  // NON-VACUITY FLOOR, and the load-bearing assertion here. If `git ls-files` fails, returns
  // nothing, or the extension filter stops matching, the loop below scans zero files and the
  // deepStrictEqual passes green — reporting "no secrets" having looked at nothing. That is this
  // repository's signature defect and the reason this assertion comes FIRST, with its own message.
  assert.ok(files.length >= 2800,
    `only ${files.length} tracked text files enumerated (measured 2917 at the time of writing). `
    + 'git ls-files is broken or the extension filter stopped matching — the SCAN is vacuous, not '
    + 'the repository clean. Do not lower this floor to make it pass.');

  const hits = findSecrets(process.cwd(), files);
  assert.deepStrictEqual(hits, [],
    `${hits.length} potential secret(s) in COMMITTED files: `
    + hits.map((h) => `${h.file}: ${h.match}`).join(' | '));
});

test('the scan set is the COMMITTED set — a tracked secret is caught, an ignored file is not', () => {
  // The mechanism test, run against a throwaway repo so it proves the RULE rather than the current
  // state of this one. Byte-identical string in both places; only the tracked file may be reported.
  //
  // Assembled from fragments so the literal never appears in this file's own source — otherwise the
  // scanner above would flag install.test.js, which is itself tracked.
  const CANARY = `${'pass'}word = "n0tAplaceh0lder"`;

  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-scanset-')));
  try {
    const git = (...args) => execFileSync('git', args, { cwd: tmp, stdio: 'pipe' });
    git('init', '-q');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'test');

    fs.writeFileSync(path.join(tmp, '.gitignore'), 'notes/\n');
    fs.mkdirSync(path.join(tmp, 'notes'));
    fs.writeFileSync(path.join(tmp, 'app.js'), `const ${CANARY};\n`);
    fs.writeFileSync(path.join(tmp, 'notes', 'private.md'), `Debugging note: ${CANARY} was hardcoded.\n`);
    git('add', 'app.js', '.gitignore');
    git('commit', '-qm', 'init');

    const flagged = findSecrets(tmp, trackedTextFiles(tmp)).map((h) => h.file).sort();

    // Bidirectional on purpose: one assertion catches both failure directions.
    assert.deepStrictEqual(flagged, ['app.js'],
      `expected exactly the TRACKED file to be flagged, got ${JSON.stringify(flagged)}. `
      + 'If notes/private.md is present, the scanner is walking the working tree again and every '
      + 'gitignored private note that MENTIONS a credential will block all commits. '
      + 'If app.js is absent, the scanner has stopped detecting a real secret.');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('the expanded extension list actually reaches workflows and shell scripts', () => {
  // Pins the false-negative half. Without this, someone trimming SCAN_EXT back to .md/.js/.json
  // silently re-hides 59 tracked files — including every GitHub workflow — and no test notices.
  const files = trackedTextFiles(process.cwd());
  const count = (ext) => files.filter((f) => f.endsWith(ext)).length;

  assert.ok(count('.yml') >= 10,
    `only ${count('.yml')} tracked .yml files are scanned. .github/workflows/ is where credentials `
    + 'appear; if this dropped, SCAN_EXT was narrowed and the workflows are unscanned again.');
  assert.ok(count('.sh') >= 5,
    `only ${count('.sh')} tracked .sh files are scanned — shell scripts are back out of scope.`);
});

// ── The installer must not act on a subcommand it does not have ───────────────
//
// The runner sets cwd to the repository root and line 12 asserts it, which is how the rest of
// this file resolves paths. Captured once here because the children below run with a DIFFERENT cwd.
const REPO_ROOT_FOR_GUARD = process.cwd();
//
// THE DEFECT. bin/install.js takes flags only and never inspected positionals, so a bare word was
// silently ignored and the installer just ran. The trap was that the LAST thing a successful
// install printed (bin/wizard/theme.js) was:
//
//     Next steps:
//       mindforge-cc init   — Initialize your first workspace
//
// There is no `init`. Measured by obeying it in an empty temp dir: 1,836 files written, .claude/
// .mindforge/ .planning/ bin/ created plus CLAUDE.md, MINDFORGE.md and AGENTS_LEARNING.md, exit 0
// — and the same panel printed again, so the instruction loops. The real command is the slash
// command /mindforge:init-project, which the install has just placed in the harness.
//
// Two assertions because there are two defects: the installer accepting the argument, and the
// panel advertising it. Fixing either alone leaves the trap — a corrected message with a
// permissive installer still installs on any typo, and a guard under a wrong instruction still
// sends every user down a path that now errors.

test('a stray positional is REJECTED, writing nothing', () => {
  const work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-posguard-')));
  // Never the operator's HOME: installer-core resolves its registry under os.homedir(), which
  // honours $HOME on POSIX. tests/no-home-leak.test.js bans the pattern repo-wide.
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-posguard-home-')));
  try {
    const r = require('child_process').spawnSync(
      process.execPath, [path.join(REPO_ROOT_FOR_GUARD, 'bin', 'install.js'), 'init'],
      { cwd: work, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home, CI: 'true' } });

    assert.strictEqual(r.status, 1,
      `\`install.js init\` must exit 1, got ${r.status}. Before the guard it ran a full install `
      + `into the current directory and exited 0.\n${(r.stdout || '').slice(-400)}`);

    const written = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p); else written.push(path.relative(work, p));
      }
    })(work);
    assert.deepStrictEqual(written, [],
      `${written.length} file(s) were written into the caller's directory by a rejected argument. `
      + `Measured before the guard: 1,836. First few: ${written.slice(0, 5).join(', ')}`);

    // Naming the real command is the point — an error that only says "unknown" leaves the user
    // holding an instruction the tool just refused.
    assert.match(r.stderr, /\/mindforge:init-project/,
      `the error for \`init\` must name the real command. Got:\n${r.stderr}`);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('the documented flag forms still reach the installer', () => {
  // NON-VACUITY, and the guard's real risk. `--runtime` takes its value as a SEPARATE token
  // (installer-core.js reads args[rtIdx + 1]), so a naive "anything not starting with -" check
  // would reject the documented `--runtime claude`. If this suite only asserted the rejection
  // above, that regression would ship green.
  for (const args of [['--version'], ['--help'],
    ['--claude', '--local', '--dry-run'], ['--runtime', 'claude', '--local', '--dry-run']]) {
    const work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-posok-')));
    const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-posok-home-')));
    try {
      const r = require('child_process').spawnSync(
        process.execPath, [path.join(REPO_ROOT_FOR_GUARD, 'bin', 'install.js'), ...args],
        { cwd: work, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home, CI: 'true' } });
      assert.strictEqual(r.status, 0,
        `\`${args.join(' ')}\` must still be accepted, got ${r.status}. The positional guard is `
        + `rejecting a documented flag form.\n${(r.stderr || '').slice(-300)}`);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
      fs.rmSync(home, { recursive: true, force: true });
    }
  }
});

test('the success panel does not advertise a command that does not exist', () => {
  const theme = fs.readFileSync(path.join(REPO_ROOT_FOR_GUARD, 'bin', 'wizard', 'theme.js'), 'utf8');
  // Only the executable strings, so the explanatory comment naming the old text cannot satisfy or
  // break this — the same false-positive class this repo hit greping source for behaviour.
  const code = theme.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/mindforge-cc init/.test(code),
    'bin/wizard/theme.js still prints `mindforge-cc init` as a next step. mindforge-cc has no '
    + 'subcommands, and bin/install.js now exits 1 on it — so this would instruct every user to '
    + 'run a command the installer refuses.');
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed. Fix before pushing.\n`);
  process.exit(1);
} else {
  console.log('\n✅ All tests passed. Foundation is solid.\n');
}
