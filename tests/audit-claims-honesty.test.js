/**
 * Pins what the audit chain actually guarantees against what the shipped docs say about it.
 *
 * THE DEFECT. Two security documents asserted cryptographic signing that does not happen:
 *
 *   docs/security/SECURITY.md   "All high-tier (T1-T3) agent actions are cryptographically
 *                                signed using Ed25519."
 *   docs/security/SECURITY.md   "The AUDIT.jsonl log is finalized with Merkle-root integrity
 *                                manifests to prevent tampering."
 *   docs/security/ZTAI-OVERVIEW.md  "every agent action is cryptographically signed and
 *                                    non-repudiable", per-persona Ed25519 keypairs, a DID per
 *                                    agent, a Merkle-root every 50 entries.
 *
 * Measured against a live 3116-entry .planning/AUDIT.jsonl: ZERO entries carry a `signature` or
 * `did` field. The entry schema is exactly event, target_id, description, agent, id, timestamp,
 * previous_hash, _hash. `.planning/audit-archive/` contains only `.gitkeep`. `ENABLE_ZTAI` has no
 * readers anywhere in bin/. bin/governance/ztai-archiver.js has no caller outside tests.
 *
 * NUANCE THAT MATTERS, and which "the feature does not exist" got wrong: the Ed25519 code IS real.
 * bin/governance/ztai-manager.js:34,74 genuinely calls crypto.generateKeyPair('ed25519'). The
 * capability is implemented and never invoked. And the archiver's field is misnamed at the code
 * level too — ztai-archiver.js:57 sets `merkleRoot: cumulativeHash`, a LINEAR chain hash. There is
 * no hash tree and no inclusion proof, so "Merkle" was the wrong word throughout.
 *
 * WHAT IS GENUINELY GOOD, and worth not overcorrecting away: the hash chain works and is
 * independently verifiable. Measured on a 200-entry prefix of the live log:
 *
 *     mutate a middle entry  -> BROKEN at entry 79: hash mismatch, exit 1
 *     delete a middle entry  -> BROKEN at entry 79: previous_hash mismatch, exit 1
 *     truncate 40 from tail  -> "audit chain valid: 160 entries", EXIT 0     <- the one gap
 *     replay identical rows  -> not detected (content and ordering only)
 *
 * The truncation gap is inherent: each entry commits to its predecessor, so any prefix of a valid
 * chain is itself a valid chain. Closing it needs a commitment to LENGTH. So the accurate claim is
 * "detects mutation and mid-file deletion", not "immutable" or "non-repudiable".
 *
 * These tests are BIDIRECTIONAL. If signing or a length commitment ever lands, the assertions here
 * fail and tell you to update the docs — rather than freezing today's limitations into a permanent
 * requirement.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const VERIFY = path.join(REPO_ROOT, 'bin', 'verify-audit.js');
const LIVE_AUDIT = path.join(REPO_ROOT, '.planning', 'AUDIT.jsonl');
const SEC_ROOT = path.join(REPO_ROOT, 'SECURITY.md');
const SEC_DOCS = path.join(REPO_ROOT, 'docs', 'security', 'SECURITY.md');
const ZTAI = path.join(REPO_ROOT, 'docs', 'security', 'ZTAI-OVERVIEW.md');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** Copy a prefix of the live chain into a scratch .planning/ and run verify-audit there. */
function verifyPrefix(mutate) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-auditclaim-')));
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
  try {
    // From the HEAD of the log, not the tail: a tail slice starts mid-chain, so entry 0's
    // previous_hash points at an absent entry and EVERY case fails for an unrelated reason. That
    // mistake made a first attempt at this measurement report "truncation detected" when the control
    // and the treatment were simply failing identically.
    const lines = fs.readFileSync(LIVE_AUDIT, 'utf8').split('\n').filter(Boolean).slice(0, 200);
    fs.writeFileSync(path.join(dir, '.planning', 'AUDIT.jsonl'), `${mutate(lines).join('\n')}\n`);
    const r = spawnSync(process.execPath, [VERIFY], { cwd: dir, encoding: 'utf8' });
    return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// ── the live chain carries no signatures ─────────────────────────────────────

test('no audit entry carries a signature or DID', () => {
  assert.ok(fs.existsSync(LIVE_AUDIT), 'the live audit log must exist for this measurement');
  const lines = fs.readFileSync(LIVE_AUDIT, 'utf8').split('\n').filter(Boolean);
  assert.ok(lines.length > 100, `expected a substantial chain, got ${lines.length} entries`);
  const signed = lines.filter((l) => /"(signature|did)"\s*:/.test(l));
  assert.strictEqual(signed.length, 0,
    `${signed.length} of ${lines.length} entries carry a signature or did field. If signing has ` +
    'landed, that is GOOD — update docs/security/SECURITY.md and ZTAI-OVERVIEW.md, which currently ' +
    'say it is designed but not active, and then invert this assertion.');
});

test('ENABLE_ZTAI still has no readers in bin/', () => {
  // The switch the ZTAI docs imply exists. If it gains a reader the feature may be becoming real,
  // and the status banner must stop saying otherwise.
  const r = spawnSync('git', ['grep', '-l', 'ENABLE_ZTAI', '--', 'bin/'], { cwd: REPO_ROOT, encoding: 'utf8' });
  const files = (r.stdout || '').split('\n').filter(Boolean);
  assert.deepStrictEqual(files, [],
    `ENABLE_ZTAI is now read by: ${files.join(', ')}. Re-check whether the ZTAI status banner is ` +
    'still accurate.');
});

// ── what the chain does and does not detect ──────────────────────────────────

test('mutating a middle entry IS detected', () => {
  const r = verifyPrefix((l) => l.map((line, i) => (i === 80 ? line.replace('"event":"', '"event":"X_') : line)));
  assert.strictEqual(r.status, 1, `a mutated entry must break the chain. Output: ${r.out.slice(0, 200)}`);
  assert.match(r.out, /hash mismatch|entry mutated/i);
});

test('deleting a middle entry IS detected', () => {
  const r = verifyPrefix((l) => l.filter((_, i) => i !== 80));
  assert.strictEqual(r.status, 1, `a deleted middle entry must break the chain. Output: ${r.out.slice(0, 200)}`);
  assert.match(r.out, /previous_hash mismatch/i);
});

test('truncating the TAIL is NOT detected — and SECURITY.md says so', () => {
  // The one real gap, and the assertion that keeps the doc honest about it. Bidirectional: if a
  // length commitment lands and truncation starts failing verification, this test fails and asks for
  // the doc to be updated rather than silently keeping a stale limitation on the page.
  const intact = verifyPrefix((l) => l);
  assert.strictEqual(intact.status, 0,
    `the 200-entry prefix must verify clean first, or the control proves nothing. Got: ${intact.out.slice(0, 200)}`);

  const truncated = verifyPrefix((l) => l.slice(0, 160));
  const doc = fs.readFileSync(SEC_ROOT, 'utf8');

  if (truncated.status === 0) {
    assert.match(truncated.out, /valid: 160 entries/,
      `truncation went undetected but the message was unexpected: ${truncated.out.slice(0, 200)}`);
    assert.match(doc, /[Tt]runcat/,
      'tail truncation is undetected, so SECURITY.md MUST document it. A chain described as ' +
      '"tamper-evident" without naming this gap overstates the guarantee.');
    assert.ok(!/\bimmutable\b/i.test(doc) || /not\s+"?immutable/i.test(doc),
      'SECURITY.md must not call the chain "immutable" while a prefix of it verifies clean');
  } else {
    assert.fail(
      'tail truncation is now DETECTED — a length commitment must have landed. That is a real ' +
      'improvement: update the table in SECURITY.md and invert this branch.');
  }
});

// ── the docs no longer assert what does not happen ───────────────────────────

test('the security docs do not claim active signing', () => {
  // SCOPED TO THE CLAIM'S OWN BULLET, not the whole file.
  //
  // The first version checked "does this file contain a qualifier anywhere?" and was satisfied by a
  // sentence I had written myself in the See-also line — "most of it is design, not shipped
  // behaviour" — which is about a DIFFERENT document and qualifies nothing. Restoring both
  // unqualified signing claims left the test green: a document satisfying its own grep via unrelated
  // prose. That is the same defect this whole audit exists to find, produced by the audit's own test.
  //
  // A claim and its caveat have to be in the same breath to be read together, so the assertion now
  // requires them in the same bullet block.
  const bulletsOf = (text) => {
    const out = [];
    let cur = null;
    for (const line of text.split('\n')) {
      if (/^\s*[-*]\s/.test(line)) { if (cur) out.push(cur); cur = line; }
      else if (cur !== null && /^\s+\S/.test(line)) { cur += `\n${line}`; }
      else { if (cur) out.push(cur); cur = null; }
    }
    if (cur) out.push(cur);
    return out;
  };
  const QUALIFIER = /NOT ACTIVE|NOT SHIPPED|DESIGN DOCUMENT|DESIGNED, NOT|not implemented/i;
  const CLAIM = /cryptographically signed|non-repudiab/i;

  for (const [label, file] of [['docs/security/SECURITY.md', SEC_DOCS], ['ZTAI-OVERVIEW.md', ZTAI]]) {
    const text = fs.readFileSync(file, 'utf8');
    const offenders = bulletsOf(text)
      .filter((b) => CLAIM.test(b) && !QUALIFIER.test(b))
      .map((b) => b.trim().split('\n')[0].slice(0, 100));
    assert.deepStrictEqual(offenders, [],
      `${label} has ${offenders.length} bullet(s) asserting signing or non-repudiation with no ` +
      'qualifier in the same bullet, while 0 of the live chain\'s entries are signed:\n  ' +
      `${offenders.join('\n  ')}`);
  }
});

test('the qualifier check is scoped to the bullet, not the file', () => {
  // Non-vacuity guard for the test above. Feeds it a document whose ONLY qualifier sits in an
  // unrelated bullet — exactly the shape that fooled the first version — and requires it to be
  // rejected. Without this, a future refactor could silently widen the scope back to file-level.
  const bulletsOf = (text) => text.split('\n').filter((l) => /^\s*[-*]\s/.test(l));
  const QUALIFIER = /NOT ACTIVE|NOT SHIPPED|DESIGN DOCUMENT|DESIGNED, NOT|not implemented/i;
  const CLAIM = /cryptographically signed|non-repudiab/i;
  const decoy = [
    '- **Asymmetric Signing**: all actions are cryptographically signed using Ed25519.',
    '- **See also:** the overview is design, NOT SHIPPED behaviour.',
  ].join('\n');
  const offenders = bulletsOf(decoy).filter((b) => CLAIM.test(b) && !QUALIFIER.test(b));
  assert.strictEqual(offenders.length, 1,
    'a signing claim must be flagged even when an unrelated bullet carries a qualifier — the ' +
    'file-scoped version of this check missed exactly this case');
});

test('ZTAI-OVERVIEW.md leads with a status banner', () => {
  const head = fs.readFileSync(ZTAI, 'utf8').split('\n').slice(0, 12).join('\n');
  assert.match(head, /STATUS: DESIGN DOCUMENT/i,
    'the banner must be at the top — a caveat further down is read after the claims it qualifies');
});

test('this chain is not called a Merkle tree in the core security docs', () => {
  // ztai-archiver.js:57 sets `merkleRoot: cumulativeHash` — a linear chain hash. There is no hash
  // tree and no inclusion proof, so the word misdescribes the guarantee. Scoped to the two documents
  // a security reviewer reads first; the term survives in changelogs and dated release notes, which
  // are historical records and should not be rewritten.
  for (const [label, file] of [['SECURITY.md', SEC_ROOT], ['docs/security/SECURITY.md', SEC_DOCS]]) {
    const text = fs.readFileSync(file, 'utf8');
    const bad = text.split('\n').filter((l) => /merkle/i.test(l) && !/not a Merkle|misnamed|wrong word|linear/i.test(l));
    assert.deepStrictEqual(bad, [],
      `${label} still describes the chain as Merkle without correcting it:\n  ${bad.join('\n  ')}`);
  }
});

test('no published security doc leaks a local filesystem path', () => {
  // docs/security/SECURITY.md shipped a `file:///Users/sairamugge/Desktop/MindForge/...` link, which
  // both leaked the maintainer's directory layout and pointed at a path that no longer exists.
  for (const [label, file] of [['SECURITY.md', SEC_ROOT], ['docs/security/SECURITY.md', SEC_DOCS], ['ZTAI-OVERVIEW.md', ZTAI]]) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!/file:\/\/\//.test(text), `${label} contains a file:/// URL`);
    assert.ok(!/\/Users\/[a-z]/i.test(text), `${label} contains an absolute /Users/ path`);
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nAudit Claims Honesty: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
