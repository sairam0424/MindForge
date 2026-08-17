/**
 * MindForge — MCP server version integrity (MCP-VER).
 *
 * WHY this file exists: mcp-server/src/index.ts hard-coded
 * `new McpServer({ name: 'mindforge', version: '11.4.0' })` while
 * mcp-server/package.json said 11.9.2. mcp-server/dist is gitignored, so that
 * literal was compiled in at publish time and shipped inside the
 * provenance-attested 11.9.2 artifact — every MCP client (Claude Desktop, Cursor,
 * the Docker MCP Catalog entry) displayed and logged serverInfo.version 11.4.0.
 * The Claude Code plugin's checked-in copy of the same bundle
 * (plugins/mindforge/mcp/dist/index.js) reported 11.4.0 too, and
 * mcp-server/server.json — the MCP Registry's view of the package — had frozen at
 * 11.5.1 in two places. Nothing guarded any of it. The version is now derived from
 * mcp-server/package.json at build time, and this file is the gate that keeps it
 * derived.
 *
 * Measurement discipline: every bundle assertion reads serverInfo.version OFF THE
 * WIRE — it spawns the bundle and performs a real MCP `initialize` handshake. It
 * deliberately does NOT grep the bundle text: esbuild inlines the manifest value as
 * a renamed variable and then a shorthand property, so the built output reads
 * `var version2 = "11.9.2"` ... `{ name: "mindforge", version: version2 }` and any
 * `version: "x.y.z"` text pattern silently stops matching. A matcher that finds
 * nothing and is read as "no drift" is exactly how the 11.4.0 literal reached npm.
 *
 * Coverage split, because the two bundles differ in availability:
 *   - plugins/mindforge/mcp/dist/index.js is TRACKED in git, so its wire check runs
 *     unconditionally in every `npm test`.
 *   - mcp-server/dist/index.js is gitignored and the root `npm test` never installs
 *     mcp-server/node_modules, so its wire check is skipped LOUDLY by default and
 *     made MANDATORY by MF_REQUIRE_MCP_BUNDLE=1 — which the release workflow sets
 *     after building the bundle and before either package is published. A silent
 *     pass on a missing dist/ is the failure mode this file exists to prevent, so
 *     the skip prints a NOT RUN banner and every other assertion still runs.
 *
 * Run: node tests/mcp-server-version.test.js
 *      MF_REQUIRE_MCP_BUNDLE=1 node tests/mcp-server-version.test.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MCP_DIR = path.join(ROOT, 'mcp-server');
const SRC_PATH = path.join(MCP_DIR, 'src', 'index.ts');
const BUILD_PATH = path.join(MCP_DIR, 'build.mjs');
const BUNDLE_PATH = path.join(MCP_DIR, 'dist', 'index.js');
const PLUGIN_BUNDLE_PATH = path.join(ROOT, 'plugins', 'mindforge', 'mcp', 'dist', 'index.js');

// How to make both bundles current after bumping the version.
const REBUILD =
  '`npm --prefix mcp-server run build && ' +
  'cp mcp-server/dist/index.js plugins/mindforge/mcp/dist/index.js`';
// Copy the bundle DIRECTLY. Do NOT reach for scripts/build-mindforge-plugin.js: it
// rm -rf's and regenerates the whole user-installable plugin tree (hundreds of files,
// a +39 command / +50 skill surface change) and breaks tests/plugin-packaging.test.js.
// The copy is byte-identical to what buildMcp() already does at
// scripts/build-mindforge-plugin.js:187 (fs.copyFileSync(mcpEntry, …/index.js)).

// Release CI sets this after it builds the bundle: a missing dist/ then FAILS
// instead of skipping, so the wire check can never be quietly absent from the one
// run that publishes to npm.
const REQUIRE_BUNDLE = process.env.MF_REQUIRE_MCP_BUNDLE === '1';

let passed = 0, failed = 0, skipped = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const readText = (p) => fs.readFileSync(p, 'utf8');

const mcpPkg = readJson(path.join(MCP_DIR, 'package.json'));

/**
 * Spawn an MCP stdio server and return the serverInfo it reports for a real
 * `initialize` request. Returns version: null when the server never answers —
 * callers MUST treat null as a failure, never as "no drift found". NODE_PATH is
 * pointed at a nonexistent directory to reproduce the clean-install condition the
 * self-contained bundle must survive (the guarantee mcp-server/smoke.mjs also makes).
 */
function readServerInfo(entryPath) {
  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mindforge-version-gate', version: '0' },
    },
  }) + '\n';

  const proc = spawnSync(process.execPath, [entryPath], {
    input: request,
    encoding: 'utf8',
    timeout: 20000,
    env: { PATH: process.env.PATH, NODE_PATH: '/nonexistent', CLAUDE_PROJECT_DIR: os.tmpdir() },
  });

  const reply = String(proc.stdout || '')
    .split('\n')
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .find((frame) => frame && frame.id === 1);

  const serverInfo = reply && reply.result ? reply.result.serverInfo : null;
  return {
    version: serverInfo && typeof serverInfo.version === 'string' ? serverInfo.version : null,
    name: serverInfo ? serverInfo.name : null,
    diagnostics: `status=${proc.status} signal=${proc.signal} stderr=${String(proc.stderr || '').slice(0, 300)}`,
  };
}

/** Write a throwaway stub server into `dir` and return its path. Caller removes dir. */
function writeStub(dir, lines) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'stub-server.js');
  fs.writeFileSync(file, lines.join('\n'));
  return file;
}

// ── 1. Manifests all agree with the canonical root version ──────────────────
// mcp-server/package.json has tracked the root version on every release commit
// (11.3.1 through 11.9.2, 14/14). Locking that in is what makes the rest of this
// file a single-source-of-truth check rather than two independent sets of numbers.
test('mcp-server/package.json matches the root package.json version', () => {
  const rootPkg = readJson(path.join(ROOT, 'package.json'));
  assert.strictEqual(
    mcpPkg.version, rootPkg.version,
    `mcp-server/package.json (${mcpPkg.version}) must equal root package.json (${rootPkg.version})`
  );
});

// server.json is the MCP Registry's view of the package; it froze at 11.5.1 in both
// places while package.json moved on four minor versions.
test('mcp-server/server.json declares the package version in every place', () => {
  const serverJson = readJson(path.join(MCP_DIR, 'server.json'));
  assert.strictEqual(
    serverJson.version, mcpPkg.version,
    `server.json .version (${serverJson.version}) must equal mcp-server/package.json (${mcpPkg.version})`
  );
  assert.ok(Array.isArray(serverJson.packages) && serverJson.packages.length > 0,
    'server.json must declare at least one package entry');
  const entries = serverJson.packages.filter((p) => p.identifier === mcpPkg.name);
  assert.strictEqual(entries.length, 1,
    `server.json must have exactly one package entry for ${mcpPkg.name}, found ${entries.length}`);
  assert.strictEqual(
    entries[0].version, mcpPkg.version,
    `server.json packages[].version (${entries[0].version}) must equal mcp-server/package.json (${mcpPkg.version})`
  );
});

// ── 2. The source must not be able to hold a version literal at all ─────────
test('src/index.ts derives serverInfo.version from package.json, never a literal', () => {
  const src = readText(SRC_PATH);
  const construction = src.match(/new McpServer\(\s*\{([^}]*)\}/);
  assert.ok(construction, 'could not locate the `new McpServer({ ... })` construction in src/index.ts');
  const args = construction[1];

  const literal = args.match(/version\s*:\s*(['"])([^'"]*)\1/);
  assert.ok(!literal,
    `serverInfo.version is a hardcoded literal (${literal && literal[2]}) — it must be derived from ` +
    'mcp-server/package.json so it cannot drift from the published version again'
  );

  const field = args.match(/version\s*:\s*([^,}]+)/);
  assert.ok(field, 'the McpServer construction must pass a `version` field');
  const id = field[1].trim();
  assert.ok(/^[A-Za-z_][A-Za-z0-9_]*$/.test(id),
    `serverInfo.version must be a plain identifier bound to package.json, got ${id}`);

  // Accept either mechanism the build supports — a named JSON import in the source,
  // or an esbuild `define` in build.mjs. Asserting the invariant (the value is bound
  // to the manifest) rather than one spelling keeps this gate honest if the build
  // later switches mechanisms, while still rejecting a file-local constant.
  const boundByImport = new RegExp(
    'import\\s*\\{[^}]*\\bversion\\s+as\\s+' + id + '\\b[^}]*\\}\\s*from\\s*[\'"]\\.\\./package\\.json[\'"]'
  ).test(src);
  const boundByDefine = new RegExp('define\\s*:\\s*\\{[^}]*\\b' + id + '\\b').test(readText(BUILD_PATH));
  assert.ok(boundByImport || boundByDefine,
    `serverInfo.version uses ${id}, but nothing binds it to mcp-server/package.json — expected either ` +
    `an \`import { version as ${id} } from '../package.json'\` in src/index.ts or an esbuild \`define\` ` +
    `for ${id} in build.mjs`);
});

// ── 3. Negative controls: prove the wire reader can actually fail ───────────
// Four numbers in this week's audit turned out to be measurement artifacts, so the
// instrument is tested before it is trusted.
test('NEGATIVE CONTROL: the wire reader reports a wrong version instead of passing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-mcpver-wrong-'));
  try {
    const stub = writeStub(dir, [
      '// Answers initialize with a version that must NOT be accepted, proving the',
      '// reader reports what the server actually sent.',
      'process.stdin.on("data", () => {',
      '  process.stdout.write(JSON.stringify({',
      '    jsonrpc: "2.0", id: 1,',
      '    result: { protocolVersion: "2024-11-05", capabilities: {},',
      '      serverInfo: { name: "mindforge", version: "0.0.0-wrong" } },',
      '  }) + "\\n");',
      '  process.exit(0);',
      '});',
      '',
    ]);
    const info = readServerInfo(stub);
    assert.strictEqual(info.version, '0.0.0-wrong',
      `reader must return the version the server actually sent; got ${info.version} (${info.diagnostics})`);
    assert.notStrictEqual(info.version, mcpPkg.version,
      'negative-control stub must not accidentally report the real version');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('NEGATIVE CONTROL: a silent server reads as null, which is treated as failure', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-mcpver-silent-'));
  try {
    const stub = writeStub(dir, [
      '// Consumes stdin and exits without answering: the "instrument read nothing"',
      '// case that must never be mistaken for "no drift found".',
      'process.stdin.resume();',
      'process.stdin.on("end", () => process.exit(0));',
      '',
    ]);
    const info = readServerInfo(stub);
    assert.strictEqual(info.version, null,
      `a server that answers nothing must read as null, got ${info.version}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── 4. The bundles users actually launch, measured on the wire ──────────────
// This one is TRACKED in git (unlike mcp-server/dist), so it is present in every
// clone and runs on every `npm test` with no flag and no build step. It is also the
// file Claude Code plugin users launch — .mcp.json points at
// ${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js — and it was reporting 11.4.0 as well.
// It is a checked-in build artifact: regenerate it, never hand-edit the literal.
test('the vendored plugin bundle reports mcp-server/package.json version over MCP initialize', () => {
  assert.ok(fs.existsSync(PLUGIN_BUNDLE_PATH),
    'plugins/mindforge/mcp/dist/index.js is missing — it is tracked in git; regenerate with ' + REBUILD);
  const info = readServerInfo(PLUGIN_BUNDLE_PATH);
  assert.ok(info.version,
    `vendored plugin bundle did not answer MCP initialize with a serverInfo.version (${info.diagnostics})`);
  assert.strictEqual(info.name, 'mindforge',
    `vendored plugin bundle reported serverInfo.name ${info.name}, expected mindforge`);
  assert.strictEqual(
    info.version, mcpPkg.version,
    `plugins/mindforge/mcp/dist/index.js tells plugin users serverInfo.version=${info.version} but ` +
    `mcp-server/package.json is ${mcpPkg.version} — this bundle is a checked-in build artifact, so ` +
    'regenerate and commit it: ' + REBUILD
  );
});

test('the BUILT mcp-server bundle reports mcp-server/package.json version over MCP initialize', () => {
  if (!fs.existsSync(BUNDLE_PATH)) {
    const why = 'mcp-server/dist/index.js is absent (dist/ is gitignored; build it with ' +
      '`cd mcp-server && npm install && npm run build`)';
    assert.ok(!REQUIRE_BUNDLE, `MF_REQUIRE_MCP_BUNDLE=1 demands the wire check, but ${why}`);
    console.log('\n  !  WIRE CHECK NOT RUN for the npm-published bundle — UNVERIFIED in this run.');
    console.log(`     ${why}\n`);
    return `SKIP: ${why}`;
  }

  const info = readServerInfo(BUNDLE_PATH);
  assert.ok(info.version,
    `built bundle did not answer MCP initialize with a serverInfo.version (${info.diagnostics})`);
  assert.strictEqual(info.name, 'mindforge',
    `built bundle reported serverInfo.name ${info.name}, expected mindforge`);
  assert.strictEqual(
    info.version, mcpPkg.version,
    `built bundle tells every MCP client serverInfo.version=${info.version} but ` +
    `mcp-server/package.json is ${mcpPkg.version} — rebuild after bumping, and never hardcode the version`
  );
});

(async () => {
  for (const { name, fn } of tests) {
    try {
      const result = await fn();
      if (typeof result === 'string' && result.startsWith('SKIP:')) {
        console.log(`  o  ${name}\n      ${result}`);
        skipped++;
      } else {
        console.log(`  PASS  ${name}`);
        passed++;
      }
    } catch (e) {
      console.error(`  FAIL  ${name}\n      ${e.message}`);
      failed++;
    }
  }
  console.log(`\nMCP Server Version: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exit(1);
})();
