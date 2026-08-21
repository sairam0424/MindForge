#!/usr/bin/env node
'use strict';
/**
 * Verify the integrity of every committed approval record, and disclose Tier-3 changes.
 *
 * Usage:
 *   node bin/governance/verify-approvals.js [--tier N] [--dir <path>] [--json]
 *
 * Exit 0 = every record is intact and current (or there are none).
 * Exit 1 = at least one record is malformed, tampered with, or stale.
 *
 * WHAT REPLACED WHAT, and why the contract changed.
 *
 * The previous gate lived inline in control-plane.yml and asked: "does .planning/approvals/
 * contain at least one file that clears an identity bar?" Measured, that question has three
 * fatal properties:
 *
 *   * It is a pure function of the DIRECTORY, not of the change. Running the identical script in
 *     a temp dir containing only the committed approval — with no git repository at all — exited
 *     0 with the same success message.
 *   * It therefore granted approval in perpetuity. One record, committed 2026-06-11 for version
 *     11.5.1, satisfied it for 67 days and 286 commits, against 11.9.2.
 *   * It was committed in c6ec9a9 — the SAME commit that relaxed the gate to accept it.
 *
 * So the old step could not distinguish an approved change from an unapproved one. This script
 * does not try to fix that by making the file mean more, because a git-tracked file cannot carry
 * authorization: anyone who can push can write one, and MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1
 * makes minting a one-liner. Verified live: before branch protection was enabled,
 * `branches/{main,develop}/protection` returned 404 and `rulesets` was empty, so nothing stood
 * behind the gate at all.
 *
 * The honest split, and what each half is worth:
 *
 *   INTEGRITY (enforced here, can fail). Records must be well-formed, checksum-consistent,
 *   honestly marked as to identity, bound to the release being built, and unexpired. This is
 *   what stops a record being edited after the fact or recycled across releases, and it runs on
 *   EVERY build rather than only Tier-3 ones — a corrupt record is corrupt regardless of tier.
 *
 *   AUTHORIZATION (not enforced here, deliberately). Enforced by branch protection: a required
 *   pull request plus required status checks on main and develop. On a Tier-3 change with no
 *   current acknowledgement this script DISCLOSES loudly and exits 0, rather than blocking. That
 *   is a deliberate choice: 28% of recent commits touch the trust surface, and blocking them
 *   behind a self-issued file would add friction proportional to nothing. Overstating a check is
 *   how the previous gate came to be trusted for two months while proving nothing.
 */

const fs = require('fs');
const path = require('path');
const { verifyRecord } = require('./approval-record');

const ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const out = { tier: null, dir: path.join(ROOT, '.planning', 'approvals'), json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tier') out.tier = String(argv[++i] ?? '').trim();
    else if (argv[i] === '--dir') out.dir = argv[++i];
    else if (argv[i] === '--json') out.json = true;
  }
  return out;
}

/** GitHub Actions annotations when running there; plain text otherwise. */
const inActions = () => Boolean(process.env.GITHUB_ACTIONS);
function notice(msg) { console.log(inActions() ? `::notice::${msg}` : msg); }
function error(msg) { console.error(inActions() ? `::error::${msg}` : msg); }
function summary(lines) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (!f) return;
  try { fs.appendFileSync(f, `${lines.join('\n')}\n`); } catch { /* summary is best-effort */ }
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const currentVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

  let files = [];
  try {
    files = fs.readdirSync(args.dir).filter((f) => f.endsWith('.json'));
  } catch {
    files = []; // an absent directory is not an error — it means no acknowledgements exist
  }

  const results = [];
  for (const f of files) {
    const p = path.join(args.dir, f);
    let rec;
    try { rec = JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch (e) {
      results.push({ file: f, ok: false, stale: false, problems: [`not valid JSON: ${e.message}`] });
      continue;
    }
    results.push({ file: f, ...verifyRecord(rec, { currentVersion }) });
  }

  const broken = results.filter((r) => !r.ok);
  const valid = results.filter((r) => r.ok);

  if (args.json) {
    console.log(JSON.stringify({ currentVersion, tier: args.tier, results }, null, 2));
  } else {
    for (const r of broken) {
      error(`approval ${r.file} is not usable:`);
      for (const p of r.problems) console.error(`    - ${p}`);
    }
    for (const r of valid) notice(`approval ${r.file} is intact and current (${currentVersion}).`);
  }

  if (broken.length) {
    error(`${broken.length} approval record(s) rejected. Remove the stale file, or re-mint with ` +
      '`node bin/governance/approve.js "<reason>"`. A record does not carry forward to a later release.');
    summary([
      '## 🔴 Approval record integrity failed',
      '',
      ...broken.flatMap((r) => [`**${r.file}**`, ...r.problems.map((p) => `- ${p}`), '']),
    ]);
    return 1;
  }

  if (!results.length) notice('No approval records present — nothing to verify.');

  // Tier-3 disclosure. Never blocks — see the header.
  if (args.tier === '3') {
    if (valid.length) {
      notice(`Tier 3 change with ${valid.length} current acknowledgement(s) on record.`);
      summary([
        '## ⚖️ Tier 3 change — acknowledged',
        '',
        ...valid.map((r) => `- \`${r.file}\``),
        '',
        'Recorded acknowledgement only. Authorization is enforced by branch protection ' +
        '(required PR + required checks), not by this file.',
      ]);
    } else {
      notice('Tier 3 change with NO recorded acknowledgement. Not blocking — see the summary.');
      summary([
        '## ⚖️ Tier 3 change — touches the trust surface',
        '',
        'This change modifies a sensitive path (auth/payment/security, `bin/governance/`, ',
        '`bin/security/`, hook registration, workflows or the approval records themselves) ',
        'and there is **no current acknowledgement** in `.planning/approvals/`.',
        '',
        '**This check does not block it, on purpose.** A git-tracked approval file cannot carry ',
        'authorization: anyone who can push can write one.',
        '',
        'Authorization comes from branch protection — a required pull request plus required ',
        'status checks on `main` and `develop`.',
        '',
        'To record a human acknowledgement (integrity-checked, 72h, bound to this release):',
        '',
        '```bash',
        'node bin/governance/approve.js "what you reviewed and why it is safe"',
        '```',
      ]);
    }
  }

  return 0;
}

module.exports = { main, parseArgs };

if (require.main === module) process.exit(main());
