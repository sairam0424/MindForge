/**
 * Guards the Tier-3 approval chain: bin/governance/approval-record.js and verify-approvals.js.
 *
 * WHAT WAS WRONG, all four measured rather than inferred:
 *
 *  1. The gate was a pure function of the DIRECTORY, not of the change. The old inline
 *     control-plane.yml script exited 0 when run in a temp dir containing only the committed
 *     approval, with NO git repository present at all.
 *  2. So one record granted approval in perpetuity: committed 2026-06-11 for version 11.5.1, it
 *     satisfied the gate for 67 days and 286 commits against 11.9.2. It was added in c6ec9a9 —
 *     the same commit that relaxed the gate to accept it.
 *  3. `signature` was sha256(`id:reason:timestamp:os.hostname()`). Not a signature (nothing
 *     signs it), and unverifiable by anyone holding the record, because hostname is not one of
 *     its fields. The gate only ever asserted its PRESENCE.
 *  4. Three record formats coexisted, so a CLI-minted approval was invisible to the dashboard
 *     and a dashboard-minted one was rejected by CI.
 *
 * The split this pins: INTEGRITY is enforced (and can fail); AUTHORIZATION is not claimed here,
 * because a git-tracked file cannot carry it — anyone who can push can write one. Authorization
 * is branch protection's job. The tests below assert BOTH halves, including that the disclosure
 * path deliberately does not block, so a later "improvement" that starts blocking on a
 * self-issued file has to change a test that explains why not.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const VERIFIER = path.join(REPO_ROOT, 'bin', 'governance', 'verify-approvals.js');
const { checksumRecord, verifyRecord, expiryFrom, SCHEMA, TTL_HOURS } =
  require(path.join(REPO_ROOT, 'bin', 'governance', 'approval-record'));
const CURRENT = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;

// A throwaway HOME for every spawned child. The verifier does not write to $HOME today, but passing
// children the real one is the pattern that let five suites silently append to the developer's
// ~/.mindforge/registry.json (installer-core.js:253 resolves it through os.homedir()). Confined here
// so the leak cannot reappear if this binary ever gains a HOME-dependent read.
// tests/no-home-leak.test.js bans the pattern repo-wide.
const SCRATCH_HOME = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-approval-home-')));

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** A well-formed, current record. `over` is applied BEFORE the checksum unless resign is false. */
function makeRecord(over = {}, resign = true) {
  const timestamp = new Date(Date.now() + 0).toISOString();
  const rec = {
    schema: SCHEMA,
    id: 'MF-AUTH-TESTFIXTURE',
    project: 'mindforge-cc',
    version: CURRENT,
    tier: 3,
    approved_by: 'fixture',
    timestamp,
    expires_at: expiryFrom(timestamp),
    reason: 'fixture record',
    identity_verification: {
      verified: false, method: 'git_identity_unverified', identity: 'fixture', unverified_ack: true,
    },
    ...over,
  };
  if (resign) rec.record_checksum = checksumRecord(rec);
  return rec;
}

/** Run the verifier against a scratch approvals dir. */
function runVerifier(dir, tier) {
  const args = [VERIFIER, '--dir', dir];
  if (tier !== undefined) args.push('--tier', String(tier));
  const r = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: SCRATCH_HOME },
  });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

function withDir(fn) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-appr-')));
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function writeRecord(dir, rec, name = 'approval-fixture.json') {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(rec, null, 2));
}

// ── the checksum is actually recomputable, which the old field was not ───────

test('the checksum recomputes from the record alone', () => {
  const rec = makeRecord();
  assert.strictEqual(rec.record_checksum, checksumRecord(rec),
    'a holder of the record must be able to reproduce the digest — the old hostname-salted ' +
    '`signature` could not be verified by anyone, including CI');
});

test('the checksum excludes itself, so verification is not circular', () => {
  const rec = makeRecord();
  const withoutField = { ...rec };
  delete withoutField.record_checksum;
  assert.strictEqual(checksumRecord(rec), checksumRecord(withoutField),
    'checksumRecord must ignore the checksum field, or a second verification pass would differ');
});

// ── the defects that let one record approve everything ──────────────────────

test('a record minted for an EARLIER release is rejected', () => {
  // The exact defect: version 11.5.1 satisfying an 11.9.2 build for 67 days.
  const rec = makeRecord({ version: '11.5.1' });
  const v = verifyRecord(rec, { currentVersion: '11.9.2' });
  assert.ok(!v.ok, 'an approval must not carry forward to a later release');
  assert.ok(v.stale, 'and it must be reported as stale rather than merely malformed');
  assert.match(v.problems.join(' '), /11\.5\.1.*11\.9\.2|does not carry forward/,
    `the problem must name both versions, got: ${v.problems.join('; ')}`);
});

test('an EXPIRED record is rejected', () => {
  const past = new Date(Date.now() - 100 * 3600 * 1000).toISOString();
  const rec = makeRecord({ timestamp: past, expires_at: expiryFrom(past) });
  const v = verifyRecord(rec, { currentVersion: CURRENT });
  assert.ok(!v.ok, `a record older than ${TTL_HOURS}h must not be accepted`);
  assert.match(v.problems.join(' '), /expired/i, `got: ${v.problems.join('; ')}`);
});

test('the actual removed record would now be rejected on multiple grounds', () => {
  // Reconstructed from the file deleted in this change, so the regression is pinned by shape
  // rather than by the file's continued existence.
  const legacy = {
    id: 'MF-AUTH-MQ9F2ZPF',
    project: 'mindforge-cc',
    version: '11.5.1',
    tier: 3,
    approved_by: 'sairamugge',
    timestamp: '2026-06-11T11:31:20.259Z',
    reason: 'Wave 8 v11.5.1: robustness JSON.parse guards',
    signature: `sha256:${'c'.repeat(64)}`,
    identity_verification: {
      verified: false, method: 'git_identity_unverified', identity: 'sairamugge', unverified_ack: true,
    },
  };
  const v = verifyRecord(legacy, { currentVersion: '11.9.2' });
  assert.ok(!v.ok, 'the record that auto-approved every Tier-3 change for 67 days must be rejected');
  const joined = v.problems.join(' ');
  assert.match(joined, /pre-v2|schema/i, 'must flag the legacy schema');
  assert.match(joined, /record_checksum/, 'must flag the missing checksum');
  assert.match(joined, /expires_at/, 'must flag the absent expiry');
  assert.ok(v.problems.length >= 3,
    `expected several independent grounds, got ${v.problems.length}: ${joined}`);
});

// ── tamper detection: the red-team attacks that landed on the proposed design ──

const TAMPERS = [
  ['reason rewritten', (r) => ({ ...r, reason: 'approved something entirely different' })],
  ['approver rewritten (repudiation)', (r) => ({ ...r, approved_by: 'someone-else' })],
  ['expiry extended by hand', (r) => ({ ...r, expires_at: '2099-01-01T00:00:00.000Z' })],
  ['timestamp back-dated', (r) => ({ ...r, timestamp: '2026-01-01T00:00:00.000Z' })],
  ['version swapped to the current build', (r) => ({ ...r, version: CURRENT, id: 'MF-AUTH-OTHER' })],
  ['identity flipped to verified', (r) => ({ ...r, identity_verification: { verified: true, method: 'gpg_key', identity: 'x', keyId: 'fake' } })],
];

for (const [label, mutate] of TAMPERS) {
  test(`tamper detected: ${label}`, () => {
    // Mutating WITHOUT re-checksumming is the realistic attack: an editor opens the committed
    // JSON and changes a field. ATK-9 (back-dated approved_at) and ATK-10 (rewritten approver)
    // both defeated the design the red team reviewed, because those fields sat outside its
    // binding. Here every field is inside the digest.
    const rec = mutate(makeRecord());
    const v = verifyRecord(rec, { currentVersion: CURRENT });
    assert.ok(!v.ok, `${label} must be detected`);
    assert.match(v.problems.join(' '), /checksum does not match/,
      `${label} must fail the checksum specifically, got: ${v.problems.join('; ')}`);
  });
}

test('an unverified record WITHOUT the explicit acknowledgement is rejected', () => {
  const rec = makeRecord({ identity_verification: { verified: false } });
  const v = verifyRecord(rec, { currentVersion: CURRENT });
  assert.ok(!v.ok, 'a bare verified:false record must not pass — only a deliberate opt-in does');
  assert.match(v.problems.join(' '), /neither GPG-verified nor an explicitly acknowledged/,
    `got: ${v.problems.join('; ')}`);
});

// ── the verifier's exit contract ─────────────────────────────────────────────

test('verifier exits 0 with no records at all', () => withDir((dir) => {
  const r = runVerifier(dir);
  assert.strictEqual(r.status, 0, `an empty approvals dir is not an error. Output:\n${r.out}`);
}));

test('verifier exits 0 on a valid current record', () => withDir((dir) => {
  writeRecord(dir, makeRecord());
  const r = runVerifier(dir, 3);
  assert.strictEqual(r.status, 0, `a valid record must pass. Output:\n${r.out}`);
  assert.match(r.out, /intact and current/, `must say so. Output:\n${r.out}`);
}));

test('verifier exits 1 on a tampered record — the real failure mode', () => withDir((dir) => {
  // Without this, "exits 0 on the live repo" would be satisfied by a script that always exits 0,
  // which is precisely the defect class this whole chain suffered from.
  writeRecord(dir, { ...makeRecord(), reason: 'edited after minting' });
  const r = runVerifier(dir, 3);
  assert.strictEqual(r.status, 1, `a tampered record must fail the build. Output:\n${r.out}`);
  assert.match(r.out, /checksum does not match/, `and say why. Output:\n${r.out}`);
}));

test('verifier exits 1 on malformed JSON, naming the file', () => withDir((dir) => {
  fs.writeFileSync(path.join(dir, 'approval-broken.json'), '{ not json');
  const r = runVerifier(dir, 1);
  assert.strictEqual(r.status, 1, `unparseable records must fail. Output:\n${r.out}`);
  assert.match(r.out, /approval-broken\.json/, 'must name the offending file');
}));

test('integrity is checked at EVERY tier, not just tier 3', () => withDir((dir) => {
  // The old step carried `if: needs.classify.outputs.tier == '3'`, so on ~72% of builds it did
  // not run at all. A required check with no failure mode most of the time is decorative.
  writeRecord(dir, { ...makeRecord(), approved_by: 'rewritten' });
  for (const tier of [1, 2, 3]) {
    const r = runVerifier(dir, tier);
    assert.strictEqual(r.status, 1,
      `a corrupt record must be rejected at tier ${tier} too. Output:\n${r.out}`);
  }
}));

// ── the disclosure path must NOT block, and that is deliberate ───────────────

test('a Tier-3 change with NO acknowledgement discloses but does not block', () => withDir((dir) => {
  // Deliberate, and load-bearing. A git-tracked approval cannot carry authorization: anyone who
  // can push writes one, and MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1 makes minting a one-liner.
  // 28% of recent commits touch a sensitive path, so blocking them behind a self-issued file
  // would add friction proportional to nothing. Authorization is branch protection's job.
  // If you are changing this to exit 1, you are re-adding the theatre — read the header first.
  const r = runVerifier(dir, 3);
  assert.strictEqual(r.status, 0,
    'a Tier-3 change with no approval on file must NOT fail the build — authorization comes ' +
    `from branch protection, not from this check. Output:\n${r.out}`);
  assert.match(r.out, /Tier 3 change with NO recorded acknowledgement/,
    `it must still disclose loudly. Output:\n${r.out}`);
}));

test('the disclosure reaches the step summary a human actually reads', () => withDir((dir) => {
  const summaryFile = path.join(dir, 'summary.md');
  fs.writeFileSync(summaryFile, '');
  const r = spawnSync(process.execPath, [VERIFIER, '--dir', dir, '--tier', '3'], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: SCRATCH_HOME, GITHUB_STEP_SUMMARY: summaryFile, GITHUB_ACTIONS: 'true' },
  });
  assert.strictEqual(r.status, 0);
  const written = fs.readFileSync(summaryFile, 'utf8');
  assert.match(written, /trust surface/i,
    'a ::notice:: scrolls past; the summary is the surface a reviewer sees. Got:\n' + written);
  assert.match(written, /branch protection/,
    'the summary must say where authorization actually comes from');
}));

// ── no stale record may sit in the repo ─────────────────────────────────────

test('the repo carries no approval record that fails verification', () => {
  // Runs against the REAL directory, so a stale record cannot be re-committed unnoticed.
  const dir = path.join(REPO_ROOT, '.planning', 'approvals');
  const r = runVerifier(dir, 1);
  assert.strictEqual(r.status, 0,
    `.planning/approvals/ must contain only intact, current records. Output:\n${r.out}`);
});

test('the misnamed `signature` field is gone from the writer', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'governance', 'approve.js'), 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // Matches BOTH `signature: ...` in an object literal and `record.signature = ...` as an
  // assignment. The first version of this assertion checked only the literal form and therefore
  // passed when a control re-added the field by assignment — a narrow regex is its own false
  // pass. `user.signingkey` (the git config lookup) does not match, and comments are stripped
  // so the paragraph explaining the removal does not trip it.
  assert.ok(!/\bsignature\s*[:=]/.test(code),
    'approve.js must not write a `signature` field, by either syntax: nothing signs it, and its ' +
    'old preimage included os.hostname() which is not part of the record, making it unverifiable ' +
    `by design. Offending line(s): ${code.split('\n').filter((l) => /\bsignature\s*[:=]/.test(l)).join(' | ')}`);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nApproval Integrity: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
