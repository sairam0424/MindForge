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
syncByRegex('sdk/README.md', /(?:@|v)(\d+\.\d+\.\d+)/g, 'sdk/README.md');
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
        const url = `https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-${CANON}.tgz`;
        process.stderr.write(`[sync-version] fetching ${url} to compute sha256…\n`);
        const buf = execFileSync('curl', ['-sL', url], { maxBuffer: 64 * 1024 * 1024 });
        sha = crypto.createHash('sha256').update(buf).digest('hex');
        process.stderr.write(`[sync-version] sha256 ${sha}\n`);
      }
      findings.push({ file: rel, found: urlVer, want: CANON, fixed: !CHECK && Boolean(sha) });
      if (!CHECK) {
        if (!sha) {
          console.error(
            `[sync-version] REFUSING to bump ${rel} without a matching sha256.\n` +
            '  A formula whose digest does not match its url makes `brew install` fail hard.\n' +
            `  Pass --sha256 <hex>, or --fetch-sha to download ${CANON} and compute it.`);
          process.exitCode = 1;
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
console.log(`${CHECK ? '❌' : '🔧'} canonical ${CANON} — ${findings.length} channel(s) out of sync:`);
for (const f of findings) {
  console.log(`   ${CHECK ? '' : f.fixed ? '[fixed] ' : '[SKIPPED] '}${f.file}: ${f.found} -> ${f.want}`);
}
if (CHECK) {
  console.log('\nRun `node scripts/sync-version.js` (add --fetch-sha to include the Homebrew formula).');
  process.exit(1);
}
console.log(`\nwrote ${wrote} file(s)`);
if (process.exitCode) console.log('one or more channels were SKIPPED — see above');
