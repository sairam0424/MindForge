#!/usr/bin/env node
'use strict';
/**
 * VER-01 — one version source, every channel.
 *
 * `package.json.version` is canonical. Everything else is derived. Before this script a
 * version bump was a manual sweep across a sprawl nobody had enumerated, and it went wrong
 * three separate times in the 11.9.2 release alone — each caught by RUNNING something rather
 * than by reading the docs:
 *   - CLAUDE.md said bumps "touch 5 files" (the real npm-relevant count is 12)
 *   - mcp-server/package-lock.json was found stale during the release gauntlet
 *   - the root and sdk lockfiles were found stale while cutting the release branch
 * and three non-npm channels were left FOUR releases behind: the Homebrew formula and the
 * Dockerfile both pinned 11.5.1, and the plugin marketplace entry 11.4.0. `docker build .`
 * with no --build-arg installed mindforge-mcp-server@11.5.1 — an image with none of 11.9.2's
 * fixes.
 *
 * Usage:
 *   node scripts/sync-version.js --check              # report drift, exit 1 if any (CI-safe, offline)
 *   node scripts/sync-version.js                      # write every derivable channel
 *   node scripts/sync-version.js --sha256 <hex>       # also rewrite the Homebrew formula
 *   node scripts/sync-version.js --fetch-sha          # fetch the published tarball and hash it
 *
 * DELIBERATE EXCLUSIONS, each with a reason rather than an omission:
 *
 *   MINDFORGE.md [REQUIRED_CORE_VERSION] — a MINIMUM FLOOR, not a mirror. Its schema entry
 *     (.mindforge/MINDFORGE-SCHEMA.json) reads "Minimum MindForge core version required by
 *     this project", and it has ZERO code readers. 11.9.1 is a truthful floor for an 11.9.2
 *     release; setting it to 11.9.2 would assert that 11.9.2 requires itself. It has
 *     historically tracked [VERSION], so if that convention is intended it needs a test, not
 *     a sweep.
 *
 *   The 10 subagent-category entries in .claude-plugin/marketplace.json — independently
 *     versioned (1.0.1–1.1.1) and verified consistent across all three surfaces they appear
 *     on. Only the `mindforge` entry tracks package.json. A regex over the file would corrupt
 *     all ten, which is why this script parses JSON and targets that one entry by name.
 *
 *   subagents/.claude-plugin/marketplace.json — has no `mindforge` entry at all (10 entries,
 *     all subagent categories). Nothing to derive.
 *
 *   The Homebrew formula's sha256 — cannot be derived offline. The script REFUSES to write a
 *     new url without a matching digest rather than emit a formula whose hash is wrong, which
 *     would make `brew install` fail hard.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const FETCH_SHA = argv.includes('--fetch-sha');
const shaIdx = argv.indexOf('--sha256');
const SHA_ARG = shaIdx >= 0 ? argv[shaIdx + 1] : null;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, text) => fs.writeFileSync(path.join(ROOT, rel), text);
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const CANON = JSON.parse(read('package.json')).version;
if (!/^\d+\.\d+\.\d+/.test(CANON)) {
  console.error(`[sync-version] package.json version is not semver-shaped: ${CANON}`);
  process.exit(2);
}

const findings = [];   // { file, found, want, fixed }
let wrote = 0;

/**
 * Compare two dotted versions numerically. Returns <0, 0 or >0.
 *
 * Numeric per component, not lexicographic: '11.10.0' is AHEAD of '11.9.2', which a string compare
 * gets backwards ('11.1' < '11.9'). Getting that wrong would classify a leading formula as a
 * harmless lag on exactly the release where it matters — the first bump past a .9 minor.
 */
function cmpSemver(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** Replace every occurrence of a single-capture regex's group with CANON. */
function syncByRegex(rel, re, label = rel) {
  if (!exists(rel)) return;
  const before = read(rel);
  const hits = [...before.matchAll(re)];
  if (hits.length === 0) {
    findings.push({ file: label, found: '(pattern not found)', want: CANON, fixed: false });
    return;
  }
  const stale = hits.filter((m) => m[1] !== CANON);
  if (stale.length === 0) return;                       // already in sync
  findings.push({ file: label, found: stale.map((m) => m[1]).join(', '), want: CANON, fixed: !CHECK });
  if (CHECK) return;
  const after = before.replace(re, (full, ver) => full.replace(ver, CANON));
  if (after !== before) { write(rel, after); wrote++; }
}

/**
 * Re-serialize JSON preserving the two conventions JSON.stringify does not round-trip:
 * the trailing newline, and \uXXXX escaping of non-ASCII.
 *
 * stringify emits literal characters, so a file written with escapes (npm writes
 * package.json's em-dash as —) comes back normalized — a one-character diff in a
 * published manifest that no version assertion can catch, because both spellings parse to
 * the same string. Escaping is a property of the serialization, not the data.
 */
function serializeLike(rel, before, data) {
  let text = JSON.stringify(data, null, 2);
  const hasEscapes = /\\u[0-9a-fA-F]{4}/.test(before);
  // eslint-disable-next-line no-control-regex
  const hasLiterals = /[^\x00-\x7F]/.test(before);
  if (hasEscapes && !hasLiterals) {
    // Uniformly-escaped file: re-escaping every non-ASCII char reproduces its convention
    // exactly. Guarding on !hasLiterals matters — escaping unconditionally would convert a
    // literal character into an escape, normalizing in the opposite direction.
    // eslint-disable-next-line no-control-regex
    text = text.replace(/[^\x00-\x7F]/g, (ch) =>
      '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
  } else if (hasEscapes && hasLiterals) {
    // Mixed conventions cannot be reproduced by a whole-file re-serialize. Emit stringify's
    // output (which preserves literals) and say so, rather than silently picking a side.
    process.stderr.write(
      `[sync-version] WARNING: ${rel} mixes \\uXXXX escapes and literal non-ASCII; ` +
      'escaped characters will be written as literals\n');
  }
  return text + (before.endsWith('\n') ? '\n' : '');
}

/** Set a version field, preserving the file's formatting conventions. */
function syncJson(rel, mutate, describe) {
  if (!exists(rel)) return;
  const before = read(rel);
  const data = JSON.parse(before);
  const found = describe(data);
  if (found === CANON) return;
  findings.push({ file: rel, found: String(found), want: CANON, fixed: !CHECK });
  if (CHECK) return;
  mutate(data);
  write(rel, serializeLike(rel, before, data));
  wrote++;
}

// ── npm-relevant manifests ───────────────────────────────────────────────────
// The lockfiles carry the version twice: top level and packages[""].
for (const rel of ['package-lock.json', 'sdk/package-lock.json', 'mcp-server/package-lock.json']) {
  syncJson(rel,
    (d) => { d.version = CANON; if (d.packages && d.packages['']) d.packages[''].version = CANON; },
    (d) => d.version);
}
for (const rel of ['sdk/package.json', 'mcp-server/package.json', '.mindforge/config.json']) {
  syncJson(rel, (d) => { d.version = CANON; }, (d) => d.version);
}
syncByRegex('sdk/src/index.ts', /VERSION = '(\d+\.\d+\.\d+)'/g);
// sdk/README.md carries the version in TWO shapes and this pattern only matched one.
//
//   ## New in v11.9.2            <- `v` prefix, matched
//   VERSION,              // '11.9.2'   <- quote prefix, MISSED
//
// So a bump left the export comment stale while the report said `[fixed] sdk/README.md` — a partial
// write announced as a complete one. Measured on an 11.9.2 -> 11.9.3 rehearsal: the heading moved,
// the comment did not, and tests/version-consistency.test.js caught it. That test is why this was
// findable at all; the tool claimed success either way.
syncByRegex('sdk/README.md', /(?:@|v|VERSION,\s*\/\/\s*')(\d+\.\d+\.\d+)/g, 'sdk/README.md');

// AGENTS.md was not a channel AT ALL — zero mentions in this file — while
// tests/doc-count-claims.test.js asserts its version against package.json. A gate demanding a value
// that nothing writes: `npm test` failed on every version bump and the documented remedy, "never
// bump by hand, run scripts/sync-version.js", could not fix it.
//
// Anchored on the exact sentence the gate reads rather than sweeping bare versions. AGENTS.md holds
// exactly one version token today, but a future Node or dependency version in this file must not be
// rewritten to the package version by a greedy pattern — that is how the marketplace subagent
// entries nearly got swept onto the core version.
syncByRegex('AGENTS.md', /MindForge v(\d+\.\d+\.\d+) is an agentic/g, 'AGENTS.md');
// MINDFORGE.md: the [VERSION] assignment and the H1 title only. [REQUIRED_CORE_VERSION] is
// deliberately excluded — see the header.
syncByRegex('MINDFORGE.md', /^\[VERSION\]\s*=\s*(\d+\.\d+\.\d+)/gm, 'MINDFORGE.md [VERSION]');
syncByRegex('MINDFORGE.md', /^# MINDFORGE\.md — Parameter Registry \(v(\d+\.\d+\.\d+)\)/gm, 'MINDFORGE.md title');
// CLAUDE.md's opening line. Contributor-facing (not in files[]), but it was 2 patches stale
// and it is the first thing an agent reads about this repo. A '(pattern not found)' finding
// here is deliberate: if the sentence is reworded, the sweep must be updated rather than
// silently covering nothing.
syncByRegex('CLAUDE.md', /`mindforge-cc`, v(\d+\.\d+\.\d+)\)/g, 'CLAUDE.md intro');

// ── the plugin marketplace entry (ONLY the `mindforge` plugin) ────────────────
{
  const rel = '.claude-plugin/marketplace.json';
  if (exists(rel)) {
    const before = read(rel);
    const data = JSON.parse(before);
    const entry = (data.plugins || []).find((p) => p.name === 'mindforge');
    if (!entry) {
      findings.push({ file: rel, found: '(no mindforge entry)', want: CANON, fixed: false });
    } else if (entry.version !== CANON) {
      findings.push({ file: `${rel} [plugins.mindforge]`, found: entry.version, want: CANON, fixed: !CHECK });
      if (!CHECK) {
        entry.version = CANON;
        write(rel, serializeLike(rel, before, data));
        wrote++;
      }
    }
  }
}

// ── Dockerfile: the ARG default is what `docker build .` uses with no flag ─────
syncByRegex('Dockerfile', /MINDFORGE_MCP_VERSION=(\d+\.\d+\.\d+)/g, 'Dockerfile');

// ── Homebrew formula: url + assert, and the digest, which cannot be derived ────
{
  const rel = 'Formula/mindforge.rb';
  if (exists(rel)) {
    const before = read(rel);
    const urlVer = (before.match(/mindforge-cc-(\d+\.\d+\.\d+)\.tgz/) || [])[1];
    if (urlVer && urlVer !== CANON) {
      let sha = SHA_ARG;
      if (!sha && FETCH_SHA && !CHECK) {
        // FAIL CLOSED. This used `curl -sL` with no -f and hashed whatever came back. npm answers an
        // unpublished version with HTTP 404 and a 21-byte body `{"error":"Not found"}`, and curl
        // exits 0 — so the digest written was the sha256 of that error text,
        // c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f, the same constant for
        // every unpublished version.
        //
        // Worse than refusing, because it turned the gate GREEN. Measured end to end on a 11.9.3
        // bump: plain sync exits 1 (formula SKIPPED), `--check` exits 1, then `--fetch-sha` writes
        // the 404 digest and `--check` exits 0 — CI passing on a formula whose digest can never
        // match its url. The REFUSING branch just below exists to prevent precisely that ("makes
        // `brew install` fail hard") and this path walked straight past it.
        //
        // Verified by CONTENT, not only status: an npm tarball is gzip and must begin with the 1f 8b
        // magic bytes. A status check alone would still accept a 200 serving an error page, and no
        // text body can satisfy the magic-byte test.
        const url = `https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-${CANON}.tgz`;
        process.stderr.write(`[sync-version] fetching ${url} to compute sha256…\n`);
        let buf = null;
        try {
          // -f makes curl exit non-zero on 4xx/5xx rather than handing us the error body.
          buf = execFileSync('curl', ['-fsSL', url], { maxBuffer: 64 * 1024 * 1024 });
        } catch (err) {
          console.error(
            `[sync-version] REFUSING: ${CANON} is not downloadable from the npm registry.\n` +
            `  ${url}\n  ${((err.stderr || '').toString().trim()) || err.message}\n` +
            '\n  A tarball digest cannot exist before the tarball does, so the formula is the LAST\n' +
            '  step of a release, not part of the version bump. Correct order:\n' +
            '    1. bump package.json, run `node scripts/sync-version.js` (formula SKIPPED, exit 1)\n' +
            `    2. tag, and let mindforge-release.yml publish ${CANON} to npm\n` +
            '    3. `node scripts/sync-version.js --fetch-sha` — the tarball now exists\n' +
            '    4. commit the formula\n');
          process.exitCode = 1;
        }
        if (buf && (buf.length < 2 || buf[0] !== 0x1f || buf[1] !== 0x8b)) {
          console.error(
            `[sync-version] REFUSING: ${url} returned ${buf.length} byte(s) that are not gzip.\n` +
            `  First bytes: ${buf.slice(0, 40).toString('utf8').replace(/\s+/g, ' ')}\n` +
            '  An npm tarball begins with the gzip magic 1f 8b. Hashing this would write a digest\n' +
            '  no real artifact can match, and `brew install` would fail hard.\n');
          process.exitCode = 1;
          buf = null;
        }
        if (buf) {
          sha = crypto.createHash('sha256').update(buf).digest('hex');
          process.stderr.write(`[sync-version] sha256 ${sha} (${buf.length} bytes)\n`);
        }
      }
      // THE FORMULA MAY LAG CANONICAL, BUT MUST NEVER LEAD IT.
      //
      // A tarball digest cannot exist before the tarball, so requiring the formula to EQUAL
      // package.json before publishing requires something impossible. Measured: bumping to 11.9.3
      // made `--check` exit 1, and since .github/workflows/mindforge-release.yml runs `npm test`,
      // which transitively covers the same claim, the publish was blocked by the very artifact that
      // can only be produced after publishing.
      //
      // Lagging is the correct transient state and is reported, never silently tolerated. Leading is
      // always wrong: a formula naming a version npm does not serve makes `brew install` fail hard,
      // which is the outcome the REFUSING branch below exists to prevent.
      //
      // This is not a new policy. CLAUDE.md already documents exactly this rule for MINDFORGE.md's
      // [REQUIRED_CORE_VERSION] — "a minimum floor ... it may lag but must never exceed canonical".
      // Applying the same rule to the other artifact that cannot be derived offline is consistency,
      // not a loosened gate.
      const lagging = cmpSemver(urlVer, CANON) < 0;
      findings.push({
        file: rel, found: urlVer, want: CANON,
        fixed: !CHECK && Boolean(sha),
        deferrable: lagging,
      });
      if (!lagging) {
        console.error(
          `[sync-version] ${rel} pins ${urlVer}, which is AHEAD of canonical ${CANON}.\n` +
          '  A formula naming a version the registry does not serve makes `brew install` fail hard.\n' +
          '  This is never a transient state — correct the formula or the canonical version.');
        process.exitCode = 1;
      }
      if (!CHECK) {
        if (!sha) {
          console.error(
            `[sync-version] DEFERRING ${rel}: it pins ${urlVer} and canonical is ${CANON}, whose\n` +
            '  tarball does not exist yet. The formula is the LAST step of a release, not part of\n' +
            '  the version bump. After the release workflow publishes, run:\n' +
            '      node scripts/sync-version.js --fetch-sha\n' +
            '  and commit the formula. Lagging is allowed and reported; leading is an error.');
        } else {
          const after = before
            .replace(/mindforge-cc-\d+\.\d+\.\d+\.tgz/g, `mindforge-cc-${CANON}.tgz`)
            .replace(/sha256 "[0-9a-f]{64}"/, `sha256 "${sha}"`)
            .replace(/assert_match "\d+\.\d+\.\d+"/, `assert_match "${CANON}"`);
          if (after !== before) { write(rel, after); wrote++; }
        }
      }
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (findings.length === 0) {
  console.log(`✅ every derivable channel is at ${CANON}`);
  process.exit(0);
}
// A finding that is `deferrable` and was not fixed is a channel legitimately BEHIND canonical — today
// only the Homebrew formula, whose digest cannot exist before the tarball. Everything else is
// blocking. Split rather than counted, so the report can distinguish "you must act" from "this
// catches up after publish" instead of collapsing both into one red number.
const deferred = findings.filter((f) => f.deferrable && !f.fixed);
const blocking = findings.filter((f) => !(f.deferrable && !f.fixed));

if (blocking.length > 0) {
  console.log(`${CHECK ? '❌' : '🔧'} canonical ${CANON} — ${blocking.length} channel(s) out of sync:`);
  for (const f of blocking) {
    console.log(`   ${CHECK ? '' : f.fixed ? '[fixed] ' : '[SKIPPED] '}${f.file}: ${f.found} -> ${f.want}`);
  }
}
if (deferred.length > 0) {
  console.log(`\n⏳ ${deferred.length} channel(s) DEFERRED until after publish (behind, not ahead):`);
  for (const f of deferred) console.log(`   ${f.file}: ${f.found} -> ${f.want}`);
  console.log('   Run `node scripts/sync-version.js --fetch-sha` once the release is on npm.');
}

if (CHECK) {
  if (blocking.length === 0) {
    console.log(`\n✅ every channel that CAN be derived offline is at ${CANON}`);
    process.exit(process.exitCode || 0);
  }
  console.log('\nRun `node scripts/sync-version.js` (add --fetch-sha to include the Homebrew formula).');
  process.exit(1);
}
console.log(`\nwrote ${wrote} file(s)`);
if (process.exitCode) console.log('a channel is AHEAD of canonical — see above');
