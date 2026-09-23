/**
 * MindForge — MCP tool surface drift guard.
 * Same class of drift tests/mcp-server-version.test.js guards for the version string,
 * applied to the TOOL LIST: mcp-server/src/index.ts is the source of truth for which
 * tools are registered, and both dist/index.js (built) and
 * plugins/mindforge/mcp/dist/index.js (checked-in, copied at release time) must expose
 * exactly that set over a real MCP tools/list call.
 *
 * Run: node tests/mcp-server-tool-surface.test.js
 *      MF_REQUIRE_MCP_BUNDLE=1 node tests/mcp-server-tool-surface.test.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC_PATH = path.join(ROOT, 'mcp-server', 'src', 'index.ts');
const BUNDLE_PATH = path.join(ROOT, 'mcp-server', 'dist', 'index.js');
const PLUGIN_BUNDLE_PATH = path.join(
  ROOT,
  'plugins',
  'mindforge',
  'mcp',
  'dist',
  'index.js',
);
const REQUIRE_BUNDLE = process.env.MF_REQUIRE_MCP_BUNDLE === '1';

let passed = 0,
  failed = 0,
  skipped = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function sourceToolNames() {
  const src = fs.readFileSync(SRC_PATH, 'utf8');
  const names = [];
  const re = /registerTool\(\s*\n?\s*["']([a-zA-Z_]+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) names.push(m[1]);
  return names.sort();
}

function listTools(entryPath) {
  const request =
    [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'mf-toolsurface', version: '0' },
        },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    ]
      .map((r) => JSON.stringify(r))
      .join('\n') + '\n';

  const proc = spawnSync(process.execPath, [entryPath], {
    input: request,
    encoding: 'utf8',
    timeout: 20000,
    env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: os.tmpdir() },
  });
  const reply = String(proc.stdout || '')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .find((f) => f && f.id === 2);
  const names =
    reply && reply.result ? reply.result.tools.map((t) => t.name).sort() : null;
  return {
    names,
    diagnostics: `status=${proc.status} signal=${proc.signal} stderr=${String(proc.stderr || '').slice(0, 300)}`,
  };
}

test('mcp-server/src/index.ts registers exactly 8 tools including mindforge_browse', () => {
  const names = sourceToolNames();
  assert.strictEqual(
    names.length,
    8,
    `expected 8 registerTool() calls, found ${names.length}: ${names.join(', ')}`,
  );
  assert.ok(
    names.includes('mindforge_browse'),
    'mindforge_browse must be registered in src/index.ts',
  );
});

test('the vendored plugin bundle exposes exactly the tools declared in src/index.ts', () => {
  const expected = sourceToolNames();
  const { names, diagnostics } = listTools(PLUGIN_BUNDLE_PATH);
  assert.ok(names, `plugin bundle tools/list did not answer (${diagnostics})`);
  assert.deepStrictEqual(
    names,
    expected,
    `plugins/mindforge/mcp/dist/index.js tool list ${JSON.stringify(names)} != source ${JSON.stringify(expected)} — ` +
      'rebuild and copy the bundle: `npm --prefix mcp-server run build && cp mcp-server/dist/index.js plugins/mindforge/mcp/dist/index.js`',
  );
});

test('the BUILT mcp-server bundle exposes exactly the tools declared in src/index.ts', () => {
  if (!fs.existsSync(BUNDLE_PATH)) {
    const why =
      'mcp-server/dist/index.js is absent (build it with `cd mcp-server && npm install && npm run build`)';
    assert.ok(
      !REQUIRE_BUNDLE,
      `MF_REQUIRE_MCP_BUNDLE=1 demands this check, but ${why}`,
    );
    console.log(`\n  !  NOT RUN: ${why}\n`);
    return 'SKIP: ' + why;
  }
  const expected = sourceToolNames();
  const { names, diagnostics } = listTools(BUNDLE_PATH);
  assert.ok(names, `built bundle tools/list did not answer (${diagnostics})`);
  assert.deepStrictEqual(
    names,
    expected,
    `built bundle tool list ${JSON.stringify(names)} != source ${JSON.stringify(expected)} (${diagnostics})`,
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
  console.log(
    `\nMCP Tool Surface: ${passed} passed, ${failed} failed, ${skipped} skipped`,
  );
  if (failed > 0) process.exit(1);
})();
