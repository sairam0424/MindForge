#!/usr/bin/env node
/**
 * Fail when an action that can execute code in the release path is not pinned to a commit.
 *
 * WHY THIS EXISTS. This package publishes to npm with SLSA provenance, so the release workflow IS the
 * trust anchor: whoever controls what runs there controls what users install. Measured before this
 * script existed:
 *
 *     41 `uses:` refs across 11 workflow files
 *      0 pinned to a commit SHA
 *      1 third-party — softprops/action-gh-release@v3, in the job carrying `contents: write`
 *                      and publishing to npm
 *
 * A mutable tag is a promise from someone else that the code will not change. `@v3` moving is a
 * one-line change in a repository nobody here controls, and it lands directly in the job that holds
 * the publish token.
 *
 * WHAT THIS ENFORCES, and what it deliberately does not:
 *
 *   HARD — every third-party action, anywhere, must be pinned to a 40-hex commit SHA.
 *   HARD — every action in the release path must be pinned, first-party included, because that is
 *          the workflow whose compromise reaches users.
 *   RATCHET — first-party actions elsewhere (actions/*, github/*) may stay on tags. The count is a
 *          ceiling that can only fall. Pinning all 36 in one change would be churn for little gain
 *          while GitHub's own actions are the least likely supply-chain vector, and
 *          .github/dependabot.yml already tracks `github-actions` monthly, so pins here stay fresh.
 *
 * THE RATCHET LOGS EVERY REMAINING UNPINNED REF, with file:line, on every run. A floor that is
 * reported as a single number invites reading "0 violations" as "everything is pinned"; it is not, and
 * this prints exactly what is not. Silent truncation is how a gate becomes a reassurance.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
// Overridable so the test can point the REAL gate at fixture workflows instead of re-implementing its
// logic. A test that reimplements the checker tests the reimplementation — the defect that let a stale
// plugin hook ship for two commits while four suites passed.
const WORKFLOW_DIR = process.env.ACTION_PIN_WORKFLOW_DIR
  ? path.resolve(process.env.ACTION_PIN_WORKFLOW_DIR)
  : path.join(ROOT, '.github', 'workflows');

// The workflow whose compromise reaches published artifacts. Everything it runs must be pinned.
const RELEASE_PATH = ['mindforge-release.yml'];

// Owners whose actions are treated as first-party for the ratchet. `./…` is a local reusable
// workflow in this repository and carries no external trust at all.
const FIRST_PARTY_OWNERS = new Set(['actions', 'github']);

// Ceiling for unpinned FIRST-PARTY refs outside the release path. Lower it as pins land; never raise
// it. Measured at the time this gate was introduced: 41 refs total, 3 pinned in the release path,
// 2 local, leaving 36 first-party on tags.
const UNPINNED_FIRST_PARTY_CEILING = Number(process.env.ACTION_PIN_CEILING || 36);

const SHA_RE = /^[0-9a-f]{40}$/;

/** Every `uses:` reference, with its file and 1-indexed line. */
function collectRefs() {
  const refs = [];
  for (const file of fs.readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f)).sort()) {
    const lines = fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const m = line.match(/^\s*(?:-\s*)?uses:\s*(.+?)\s*(?:#.*)?$/);
      if (!m) return;
      const raw = m[1].replace(/^["']|["']$/g, '');
      const atIdx = raw.lastIndexOf('@');
      const name = atIdx === -1 ? raw : raw.slice(0, atIdx);
      const ref = atIdx === -1 ? '' : raw.slice(atIdx + 1);
      const local = name.startsWith('./') || name.startsWith('.\\');
      const owner = local ? '.' : name.split('/')[0];
      refs.push({
        file, line: i + 1, name, ref, local,
        owner,
        firstParty: local || FIRST_PARTY_OWNERS.has(owner),
        pinned: SHA_RE.test(ref),
        inReleasePath: RELEASE_PATH.includes(file),
        // Keep the human-readable version comment so a pin is reviewable.
        comment: (line.match(/#\s*(v[0-9][^\s]*)/) || [])[1] || null,
      });
    });
  }
  return refs;
}

function main() {
  const refs = collectRefs();
  const violations = [];
  const warnings = [];

  if (refs.length === 0) {
    console.error('verify-action-pinning: found NO `uses:` references — the parser is broken, or the '
      + 'workflows moved. Refusing to report success on an empty scan.');
    process.exit(1);
  }

  // A local reusable workflow has no external ref to pin.
  const external = refs.filter((r) => !r.local);

  for (const r of external) {
    const where = `${r.file}:${r.line}`;
    if (!r.firstParty && !r.pinned) {
      violations.push(`${where}  THIRD-PARTY not pinned: ${r.name}@${r.ref}`);
    } else if (r.inReleasePath && !r.pinned) {
      violations.push(`${where}  RELEASE PATH not pinned: ${r.name}@${r.ref}`);
    }
    if (r.pinned && !r.comment) {
      warnings.push(`${where}  pinned but no version comment: ${r.name} — add \`# vX.Y.Z\` so the pin is reviewable`);
    }
  }

  const unpinnedFirstParty = external.filter((r) => r.firstParty && !r.pinned && !r.inReleasePath);

  console.log(`Action pinning: ${refs.length} refs (${external.length} external, ${refs.length - external.length} local)`);
  console.log(`  pinned to a commit:            ${external.filter((r) => r.pinned).length}`);
  console.log(`  third-party:                   ${external.filter((r) => !r.firstParty).length} `
    + `(${external.filter((r) => !r.firstParty && r.pinned).length} pinned)`);
  console.log(`  release path (${RELEASE_PATH.join(', ')}): `
    + `${external.filter((r) => r.inReleasePath).length} refs, `
    + `${external.filter((r) => r.inReleasePath && r.pinned).length} pinned`);

  // NEVER a bare number. Every remaining unpinned ref is named, every run.
  console.log(`  first-party still on mutable tags: ${unpinnedFirstParty.length} `
    + `(ceiling ${UNPINNED_FIRST_PARTY_CEILING}) — these are NOT pinned:`);
  for (const r of unpinnedFirstParty) {
    console.log(`      ${r.file}:${r.line}  ${r.name}@${r.ref}`);
  }

  for (const w of warnings) console.log(`  ⚠️  ${w}`);

  if (unpinnedFirstParty.length > UNPINNED_FIRST_PARTY_CEILING) {
    violations.push(`first-party unpinned count rose to ${unpinnedFirstParty.length}, above the `
      + `ceiling of ${UNPINNED_FIRST_PARTY_CEILING}. The ratchet only turns one way — pin the new ref `
      + 'rather than raising the ceiling.');
  }

  if (violations.length) {
    console.error(`\n${violations.length} PINNING VIOLATION(S):`);
    for (const v of violations) console.error(`  ✖ ${v}`);
    console.error('\nResolve a tag to its commit with:');
    console.error('  gh api repos/<owner>/<repo>/git/ref/tags/<tag> --jq .object.sha');
    console.error('  # if .object.type is "tag" (annotated), dereference:');
    console.error('  gh api repos/<owner>/<repo>/git/tags/<sha> --jq .object.sha');
    console.error('Then write `uses: owner/repo@<40-hex> # vX.Y.Z`. Never invent a SHA.');
    process.exit(1);
  }

  if (unpinnedFirstParty.length < UNPINNED_FIRST_PARTY_CEILING) {
    console.log(`\n✅ pinning OK. Ceiling can be lowered to ${unpinnedFirstParty.length} in `
      + 'scripts/ci/verify-action-pinning.js.');
  } else {
    console.log('\n✅ pinning OK');
  }
  process.exit(0);
}

module.exports = { collectRefs, SHA_RE, UNPINNED_FIRST_PARTY_CEILING, RELEASE_PATH };

if (require.main === module) {
  main();
}
