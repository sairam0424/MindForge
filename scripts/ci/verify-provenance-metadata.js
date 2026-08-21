#!/usr/bin/env node
'use strict';
/**
 * Refuse to reach a `npm publish --provenance` that the registry will reject.
 *
 * THE HOLE THIS CLOSES. v11.9.4 published mindforge-cc and mindforge-mcp-server irreversibly, then
 * failed on the third package:
 *
 *   npm error 422 Unprocessable Entity - PUT https://registry.npmjs.org/mindforge-sdk
 *     Error verifying sigstore provenance bundle: Failed to validate repository information:
 *     package.json: "repository.url" is "", expected to match
 *     "https://github.com/sairam0424/MindForge" from provenance
 *
 * sdk/package.json had no `repository` field. The other two did. That is the whole difference.
 *
 * WHY NOTHING CAUGHT IT. The comparison is made by the REGISTRY at PUT time, not by the npm CLI:
 * `npm publish --dry-run` does not perform it, and npm builds the attestation from
 * $GITHUB_REPOSITORY without ever consulting the manifest field it will later be compared against.
 * Locally, no test or script in this repository read `repository` at all, and sync-version.js touches
 * only `.version`. All six preflight gates passed on a manifest guaranteed to be rejected — the
 * failure was unreachable before the point of no return.
 *
 * WHERE IT RUNS. The `preflight` job of mindforge-release.yml, alongside `version:check` — ahead of
 * every publish. Deliberately NOT in `npm test`: the expected owner is derived from the git remote,
 * so a fork contributor whose origin is their own account would see a red suite for a condition that
 * is correct for them and irrelevant to their PR.
 *
 * DISCOVERY, NOT A HARDCODED LIST. The packages checked are read out of the workflow: every step
 * whose `run` contains both `npm publish` and `--provenance`, resolved through its
 * `working-directory`. Add a fourth package to the workflow and it is covered without touching this
 * file. Miss the discovery entirely and this exits non-zero rather than passing vacuously — the same
 * floor tests/run-all.js applies to itself, and the reason is identical: a shape change in the thing
 * being scanned must not read as "nothing to check".
 *
 * CASE-SENSITIVE. npm documents the requirement as "a public repository that matches
 * (case-sensitive)". `git+` prefixes, `.git` suffixes, `git@host:owner/repo` and a trailing slash are
 * all tolerated and normalised away; a case-only difference is reported, because the registry rejects
 * it and a reader comparing by eye will not see it.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOW = path.join('.github', 'workflows', 'mindforge-release.yml');

/** github.com/<owner>/<repo> out of any remote spelling npm might normalise. */
function normalizeRepoUrl(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let s = raw.trim()
    .replace(/^git\+/, '')
    .replace(/^ssh:\/\//, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '');
  s = s.replace(/^git@([^:]+):/, 'https://$1/');       // git@github.com:owner/repo
  s = s.replace(/^https?:\/\/[^@]*@/, 'https://');      // strip any embedded credentials
  const m = s.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)$/);
  return m ? `https://github.com/${m[1]}/${m[2]}` : null;
}

/** The owner/repo this workflow will attest to. GITHUB_REPOSITORY in CI; the git remote locally. */
function expectedRepo() {
  if (process.env.GITHUB_REPOSITORY) {
    return { value: `https://github.com/${process.env.GITHUB_REPOSITORY}`, source: 'GITHUB_REPOSITORY' };
  }
  const r = spawnSync('git', ['config', '--get', 'remote.origin.url'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return { value: null, source: 'git remote origin (unreadable)' };
  return { value: normalizeRepoUrl(r.stdout), source: `git remote origin (${r.stdout.trim()})` };
}

/**
 * Steps that publish with provenance, and the manifest each one publishes.
 *
 * Deliberately no YAML dependency: `yaml` does not resolve in this tree and `js-yaml` is only an
 * undeclared transitive, so importing either would make a release gate depend on a package nothing
 * declares. The shape being parsed is a fixed-indent step list, and the vacuity floor below is what
 * makes that safe — if the shape changes, this reports zero and fails rather than passing.
 */
function provenancePublishTargets(workflowText) {
  const steps = [];
  let current = null;
  for (const line of workflowText.split('\n')) {
    const name = line.match(/^ {6}- name: (.+)$/);
    if (name) {
      if (current) steps.push(current);
      current = { name: name[1].trim(), dir: '.', run: [] };
      continue;
    }
    if (!current) continue;
    const wd = line.match(/^ {8}working-directory: (.+)$/);
    if (wd) { current.dir = wd[1].trim().replace(/^['"]|['"]$/g, ''); continue; }
    current.run.push(line);
  }
  if (current) steps.push(current);

  return steps
    .filter((s) => {
      const body = s.run.join('\n');
      return /npm publish/.test(body) && /--provenance/.test(body);
    })
    .map((s) => ({ step: s.name, manifest: path.join(s.dir, 'package.json') }));
}

function main() {
  const failures = [];
  const absWorkflow = path.join(ROOT, WORKFLOW);
  if (!fs.existsSync(absWorkflow)) {
    console.error(`✗ ${WORKFLOW} not found — cannot determine what this release publishes.`);
    process.exit(1);
  }

  const targets = provenancePublishTargets(fs.readFileSync(absWorkflow, 'utf8'));

  // VACUITY FLOOR. Zero discovered targets means the parse missed, not that nothing publishes.
  if (targets.length === 0) {
    console.error(`✗ found no "npm publish --provenance" step in ${WORKFLOW}.`);
    console.error('  Either provenance was removed from the release path — which is a regression on its');
    console.error('  own — or this gate\'s step parsing no longer matches the file. Refusing to report');
    console.error('  success for a check that examined nothing.');
    process.exit(1);
  }

  const expected = expectedRepo();
  if (!expected.value) {
    console.error(`✗ could not determine the expected repository from ${expected.source}.`);
    console.error('  npm compares package.json\'s repository.url against the repo it attests to, so');
    console.error('  without knowing that value this gate cannot make its comparison.');
    process.exit(1);
  }

  console.log(`Provenance metadata gate — expecting ${expected.value}`);
  console.log(`  source: ${expected.source}`);
  console.log(`  ${targets.length} package(s) publish with --provenance in ${WORKFLOW}\n`);

  for (const { step, manifest } of targets) {
    const abs = path.join(ROOT, manifest);
    if (!fs.existsSync(abs)) {
      failures.push(`${manifest} does not exist, but "${step}" publishes from it`);
      continue;
    }
    let pkg;
    try { pkg = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch (err) {
      failures.push(`${manifest} is not parseable JSON: ${err.message}`);
      continue;
    }

    const repo = pkg.repository;
    const raw = typeof repo === 'string' ? repo : (repo && repo.url);
    if (!raw) {
      failures.push(`${manifest} (${pkg.name || 'unnamed'}) has no repository.url. The registry reports `
        + 'this as `"repository.url" is ""` and rejects the publish with 422 AFTER any earlier package '
        + 'has already published irreversibly. This is the v11.9.4 failure exactly.');
      continue;
    }

    const got = normalizeRepoUrl(raw);
    if (!got) {
      failures.push(`${manifest} (${pkg.name}) has repository.url "${raw}", which does not resolve to a `
        + 'github.com/<owner>/<repo> that npm can compare against the attestation.');
      continue;
    }
    if (got !== expected.value) {
      const caseOnly = got.toLowerCase() === expected.value.toLowerCase();
      failures.push(`${manifest} (${pkg.name}) points at ${got}, expected ${expected.value}`
        + (caseOnly ? ' — the difference is CASE ONLY, and npm matches case-sensitively.' : '.'));
      continue;
    }
    console.log(`  ✓ ${pkg.name} — ${manifest} → ${got}`);
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} package(s) cannot publish with provenance:\n`);
    for (const f of failures) console.error(`  - ${f}\n`);
    console.error('  Add or correct the repository field. Copy the spelling from the root package.json;');
    console.error('  a "directory" key is optional for the check and correct for a monorepo subpackage.');
    process.exit(1);
  }

  console.log(`\n✅ all ${targets.length} provenance-published package(s) carry a matching repository.url`);
}

if (require.main === module) main();

module.exports = { normalizeRepoUrl, provenancePublishTargets, expectedRepo };
