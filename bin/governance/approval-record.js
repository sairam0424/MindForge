'use strict';
/**
 * Canonical approval-record integrity, shared by the writer and every verifier.
 *
 * WHY THIS EXISTS — what the old record actually proved: nothing.
 *
 * bin/governance/approve.js stamped
 *     signature = sha256(`${id}:${reason}:${timestamp}:${os.hostname()}`)
 * and called it a signature. Three problems, all measured:
 *
 *   1. It is NOT a signature. Nothing signs it; there is no key and no asymmetry. Anyone who
 *      can write the file can compute the value.
 *   2. It is UNVERIFIABLE by design. `os.hostname()` is part of the preimage but is NOT a field
 *      of the record, so a verifier holding the record cannot reproduce the digest. CI never
 *      could have checked it.
 *   3. Nothing checked it anyway. control-plane.yml asserted `!rec.signature` — presence only.
 *
 * So the field was simultaneously misnamed, uncheckable and unchecked. It is replaced by
 * `record_checksum`: a plain SHA-256 over the record's OWN canonical fields, which any holder
 * can recompute. That makes it a real tamper-check on the record's contents — and nothing more,
 * which is why it is not called a signature.
 *
 * WHAT THIS DOES NOT PROVIDE. A checksum over a git-tracked file is an INTEGRITY control, never
 * an AUTHORIZATION one: anyone with push access can mint a fresh record with a valid checksum.
 * Authorization on this repo comes from branch protection (a required PR plus required status
 * checks on main and develop), not from a file. Verified live before this was written:
 * `branches/{main,develop}/protection` returned 404 and `rulesets` was empty, so for the whole
 * period this record format existed there was no enforcement layer of any kind behind it.
 *
 * The construction deliberately mirrors bin/governance/audit-hash.js — twelve lines, one
 * function, used by writer and verifier alike. That module's discipline ("MUST be the single
 * source of truth for both") is exactly what kept the audit chain honest while this record rotted,
 * so it is copied rather than reinvented.
 */

const crypto = require('crypto');

/** Field written last and excluded from its own digest. */
const CHECKSUM_FIELD = 'record_checksum';

/** Current record schema. A record without it is a pre-v2 record and is not accepted. */
const SCHEMA = 'mindforge.approval/v2';

/** How long a recorded acknowledgement stays current. */
const TTL_HOURS = 72;

/**
 * SHA-256 over the record's own fields, with the checksum field removed.
 *
 * Determinism note: like audit-hash.js this relies on JSON.stringify emitting keys in insertion
 * order, which is why writer and verifier MUST both go through this function. A verifier that
 * rebuilt the object literal in a different order would compute a different digest and reject
 * every valid record — so do not inline this construction anywhere, including in YAML.
 *
 * @param {object} record
 * @returns {string} `sha256:<hex>`
 */
function checksumRecord(record) {
  const material = { ...record };
  delete material[CHECKSUM_FIELD];
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(material)).digest('hex')}`;
}

/** ISO timestamp `hours` after `fromIso`. */
function expiryFrom(fromIso, hours = TTL_HOURS) {
  return new Date(new Date(fromIso).getTime() + hours * 3600 * 1000).toISOString();
}

const REQUIRED_FIELDS = ['schema', 'id', 'project', 'version', 'tier', 'approved_by', 'timestamp', 'expires_at', 'reason', 'identity_verification'];

/**
 * Check one approval record's integrity and currency.
 *
 * This answers "is this record intact, and is it about the release being built?" It does NOT
 * answer "was this change authorized" — see the header.
 *
 * The currency checks are the ones that matter in practice. A record with no expiry and no
 * version binding satisfied the old gate in perpetuity: the committed approval was minted
 * 2026-06-11 for version 11.5.1 and was still accepted 67 days and 286 commits later, against
 * 11.9.2, because the gate read only the directory's contents.
 *
 * @param {object} record
 * @param {{currentVersion:string, now?:Date}} ctx
 * @returns {{ok:boolean, problems:string[], stale:boolean}}
 */
function verifyRecord(record, ctx) {
  const problems = [];
  let stale = false;

  if (!record || typeof record !== 'object') {
    return { ok: false, problems: ['record is not a JSON object'], stale: false };
  }

  if (record.schema !== SCHEMA) {
    problems.push(
      record.signature && !record.schema
        ? 'pre-v2 record (has the removed `signature` field, no `schema`). Its digest included ' +
          'os.hostname(), which is not a field of the record, so it can never be verified. Re-mint it.'
        : `unknown schema ${JSON.stringify(record.schema)} — expected ${SCHEMA}`);
  }

  for (const f of REQUIRED_FIELDS) {
    if (record[f] === undefined || record[f] === null || record[f] === '') {
      problems.push(`missing required field \`${f}\``);
    }
  }

  if (record[CHECKSUM_FIELD]) {
    const expected = checksumRecord(record);
    if (record[CHECKSUM_FIELD] !== expected) {
      problems.push(`${CHECKSUM_FIELD} does not match the record contents — it has been edited since minting`);
    }
  } else {
    problems.push(`missing \`${CHECKSUM_FIELD}\``);
  }

  const iv = record.identity_verification;
  const isVerified = iv && iv.verified === true;
  const isAckedUnverified = iv && iv.verified === false
    && iv.method === 'git_identity_unverified' && iv.unverified_ack === true;
  if (!isVerified && !isAckedUnverified) {
    problems.push('identity is neither GPG-verified nor an explicitly acknowledged unverified ' +
      'approval (verified:false + method git_identity_unverified + unverified_ack:true)');
  }

  // Currency. Reported separately from malformedness because a stale record is a correctly-made
  // record that has simply stopped applying — a different thing from a corrupt one.
  if (record.version && ctx.currentVersion && record.version !== ctx.currentVersion) {
    stale = true;
    problems.push(`records version ${record.version} but the build is ${ctx.currentVersion} — ` +
      'an approval does not carry forward to a later release');
  }
  const now = ctx.now || new Date();
  if (record.expires_at) {
    const exp = new Date(record.expires_at);
    if (Number.isNaN(exp.getTime())) problems.push(`expires_at is not a valid date: ${record.expires_at}`);
    else if (exp <= now) {
      stale = true;
      const ageH = Math.round((now - exp) / 3600000);
      problems.push(`expired ${ageH}h ago (expires_at ${record.expires_at})`);
    }
  }

  return { ok: problems.length === 0, problems, stale };
}

module.exports = { checksumRecord, verifyRecord, expiryFrom, CHECKSUM_FIELD, SCHEMA, TTL_HOURS, REQUIRED_FIELDS };
