/**
 * Guards the SHIPPED protocol file against naming things that do not exist.
 *
 * `.claude/CLAUDE.md` is the highest-leverage document in the package: the installer writes it into
 * every consumer project and the model reads it at the start of every session. It instructed the
 * agent to do two things that were impossible.
 *
 * MEASURED. It named exactly two `.js` files and BOTH were unresolvable anywhere in the repo:
 *
 *   "2. Run `soul-engine.js` on the proposed diff."          <- no such file
 *   "1. Initialize `shard-controller.js`."                   <- no such file
 *
 * and its six-entry COMMAND SUITE advertised two slash commands with no backing file:
 * `/mindforge:brainstorming` and `/mindforge:history`. Not a mirror gap —
 * `.claude/commands/mindforge/` and `.agent/mindforge/` hold exactly 221 files each — and neither
 * had a near-match worth correcting to (nearest by edit distance: `gaming` at 8, `hire` at 4).
 *
 * WHY NO REPOINT. Three candidate replacements were checked and all three failed, which is the
 * substance of this fix rather than a footnote:
 *   - `bin/review/ads-engine.js` IS installed, but exposes no CLI — no `require.main`, no
 *     `process.argv`, only `module.exports`. `node bin/review/ads-engine.js --diff HEAD~1` emits
 *     0 bytes and exits 0. Its `runADSSynthesis()` takes `{phaseNum, goal, context, sessionId}`
 *     and makes live model calls; it never takes a diff.
 *   - `bin/shard-helper.js` has a real CLI, but is NOT installed into consumer projects.
 *   - `bin/harness-audit.js`, the only code reader of SOUL.md, is NOT installed either.
 * So every available repoint would have replaced one false claim with another. The protocol now
 * describes reasoning steps and names a script only where one genuinely exists and ships.
 *
 * The four names still appear in this repo's CLAUDE.md, inside prose stating that they do not exist.
 * The first version of this file handled that with a name-keyed allowlist, and falsification killed
 * the idea outright: with `soul-engine.js` exempted, restoring the literal instruction "Run
 * `soul-engine.js` on the proposed diff" left the suite GREEN. The exemption was blind to context
 * and excused the exact defect the check exists to find. The prose is now worded so it does not trip
 * the patterns at all, and there is no exemption list — see the note above PROSE_CLAIMS_ABSENT_JS.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = fs.realpathSync(path.join(__dirname, '..'));
const PROTOCOL = path.join(ROOT, '.claude', 'CLAUDE.md');
const MIRROR = path.join(ROOT, '.agent', 'CLAUDE.md');
const PLUGIN_SKILL = path.join(ROOT, 'plugins', 'mindforge', 'skills', 'mindforge-protocol', 'SKILL.md');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/**
 * THERE IS NO EXEMPTION LIST, deliberately, and that is the second thing this file gets right.
 *
 * The first version allowlisted `soul-engine.js`, `shard-controller.js`, `/mindforge:brainstorming`
 * and `/mindforge:history` — because the protocol file names them in prose stating they do not
 * exist. Falsification showed the cost immediately: reinstating the literal instruction
 * "Run `soul-engine.js` on the proposed diff" left the suite GREEN, and so did putting
 * `/mindforge:brainstorming` back into the COMMAND SUITE. A name-keyed exemption is blind to
 * context, so it excused the exact defect the check exists to find.
 *
 * The prose was rewritten to name those four without backticks and without the `/mindforge:` form,
 * so it no longer trips the patterns at all. A gate with no allowlist cannot have an allowlist whose
 * reason has expired.
 *
 * What the prose CLAIMS is still asserted below — separately, and not as an exemption.
 */
const PROSE_CLAIMS_ABSENT_JS = ['soul-engine.js', 'shard-controller.js'];
const PROSE_CLAIMS_ABSENT_COMMANDS = ['brainstorming', 'history'];

/** Resolve a bare or repo-relative .js reference anywhere in the tree, excluding vendored copies. */
function resolvesInRepo(ref) {
  if (ref.includes('/')) return fs.existsSync(path.join(ROOT, ref));
  const skip = new Set(['node_modules', '.git', 'plugins', 'dist', 'coverage']);
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!skip.has(e.name)) stack.push(path.join(dir, e.name));
      } else if (e.name === ref) { return true; }
    }
  }
  return false;
}

const commandExists = (name) =>
  fs.existsSync(path.join(ROOT, '.claude', 'commands', 'mindforge', `${name}.md`));
const mirrorCommandExists = (name) =>
  fs.existsSync(path.join(ROOT, '.agent', 'mindforge', `${name}.md`));

test('every .js file the shipped protocol names actually exists', () => {
  const text = fs.readFileSync(PROTOCOL, 'utf8');
  const refs = [...new Set([...text.matchAll(/`([a-zA-Z0-9._/-]+\.js)`/g)].map((m) => m[1]))];

  // NON-VACUITY: if the pattern matched nothing this assertion would be trivially satisfied, and
  // the whole file could fill up with phantom scripts unchallenged.
  assert.ok(refs.length > 0,
    'no backticked .js reference was found in .claude/CLAUDE.md. Either the file stopped naming '
    + 'scripts (delete this test) or the pattern broke (fix it) — it must not silently pass.');

  // No exemption: every backticked .js must resolve, full stop.
  const unresolvable = refs.filter((r) => !resolvesInRepo(r));
  assert.deepStrictEqual(unresolvable, [],
    `the shipped protocol file instructs the agent to run ${unresolvable.length} script(s) that do `
    + `not exist: ${unresolvable.join(', ')}. This file is written into every consumer project and `
    + 'read at the start of every session, so a phantom script here is an instruction every user '
    + 'receives and cannot follow. Name a real path, or describe the step as reasoning.');
});

test('the prose\'s own claims about what is missing are still true', () => {
  // Not an exemption — an assertion about the DOCUMENT. The protocol file states that these four
  // do not exist; if one is created, that sentence becomes the false claim and this says so.
  for (const ref of PROSE_CLAIMS_ABSENT_JS) {
    assert.ok(!resolvesInRepo(ref),
      `${ref} now EXISTS, but .claude/CLAUDE.md still states that it does not. Update the prose and `
      + 'remove it from PROSE_CLAIMS_ABSENT_JS — a stale claim is a lie with a test protecting it.');
  }
  for (const name of PROSE_CLAIMS_ABSENT_COMMANDS) {
    assert.ok(!commandExists(name) && !mirrorCommandExists(name),
      `/mindforge:${name} now has a command file, but the protocol file still says it does not `
      + 'exist. Restore it to the COMMAND SUITE and drop it from PROSE_CLAIMS_ABSENT_COMMANDS.');
  }
});

test('every /mindforge: command the shipped protocol names has a backing file in BOTH roots', () => {
  const text = fs.readFileSync(PROTOCOL, 'utf8');
  const names = [...new Set([...text.matchAll(/\/mindforge:([a-z][a-z0-9-]*)/g)].map((m) => m[1]))];

  assert.ok(names.length >= 4,
    `only ${names.length} /mindforge: command(s) found in the protocol file — the COMMAND SUITE is `
    + 'the point of this check, so too few means the pattern or the file changed shape');

  const broken = [];
  for (const n of names) {
    const inClaude = commandExists(n);
    const inAgent = mirrorCommandExists(n);
    // BOTH roots, because the two harnesses read different trees: a command present only in
    // .claude/ is missing for every Gemini/Antigravity user, and vice versa. Measured at the time
    // of writing: both roots hold exactly 221 files, so asymmetry is a real defect, not a norm.
    if (!inClaude || !inAgent) {
      broken.push(`/mindforge:${n} (.claude: ${inClaude ? 'yes' : 'MISSING'}, `
        + `.agent: ${inAgent ? 'yes' : 'MISSING'})`);
    }
  }
  assert.deepStrictEqual(broken, [],
    `the shipped protocol advertises ${broken.length} command(s) a user cannot run:\n  `
    + `${broken.join('\n  ')}\nEvery consumer install receives this file.`);
});

test('the .agent mirror is byte-identical to the .claude protocol file', () => {
  // They are two copies of one document for two harnesses. Any divergence means one set of users
  // is following different rules, and the divergence is invisible without this.
  assert.strictEqual(fs.readFileSync(MIRROR, 'utf8'), fs.readFileSync(PROTOCOL, 'utf8'),
    '.agent/CLAUDE.md and .claude/CLAUDE.md have diverged. Edit one and copy it to the other.');
});

test('the generated plugin skill carries no claim the protocol file has dropped', () => {
  // plugins/mindforge is GENERATED by scripts/build-mindforge-plugin.js from .agent/CLAUDE.md, and
  // CI fails if the committed copy does not reproduce from source. This is the cheap local version
  // of that gate: it catches "fixed the source, forgot to regenerate" without a full plugin build.
  if (!fs.existsSync(PLUGIN_SKILL)) return;         // plugin tree is optional
  const skill = fs.readFileSync(PLUGIN_SKILL, 'utf8');
  for (const n of PROSE_CLAIMS_ABSENT_COMMANDS) {
    const asClaim = new RegExp(`^- \`/mindforge:${n}\``, 'm');
    assert.ok(!asClaim.test(skill),
      `the generated plugin skill still advertises /mindforge:${n} in its COMMAND SUITE. Run `
      + '`node scripts/build-mindforge-plugin.js` after editing .agent/CLAUDE.md.');
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nProtocol Claims: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
