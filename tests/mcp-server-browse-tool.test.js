/**
 * MindForge — mindforge_browse MCP tool surface (wire-level, no Chromium/daemon required).
 * Spawns the built MCP server bundle and drives it over real MCP JSON-RPC, the same
 * pattern tests/mcp-server-version.test.js uses. The browser daemon is deliberately NOT
 * started here: the test asserts the tool degrades gracefully instead of hanging or crashing.
 *
 * Run: node tests/mcp-server-browse-tool.test.js
 *      MF_REQUIRE_MCP_BUNDLE=1 node tests/mcp-server-browse-tool.test.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BUNDLE_PATH = path.join(ROOT, 'mcp-server', 'dist', 'index.js');
const REQUIRE_BUNDLE = process.env.MF_REQUIRE_MCP_BUNDLE === '1';

let passed = 0,
  failed = 0,
  skipped = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function callServer(entryPath, requests) {
  const input = requests.map((r) => JSON.stringify(r)).join('\n') + '\n';
  const proc = spawnSync(process.execPath, [entryPath], {
    input,
    encoding: 'utf8',
    timeout: 20000,
    env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: os.tmpdir() },
  });
  const replies = String(proc.stdout || '')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return {
    replies,
    diagnostics: `status=${proc.status} signal=${proc.signal} stderr=${String(proc.stderr || '').slice(0, 500)}`,
  };
}

const INIT = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mf-browse-test', version: '0' },
  },
};
const INITIALIZED = {
  jsonrpc: '2.0',
  method: 'notifications/initialized',
  params: {},
};

test('tools/list includes mindforge_browse with an honest open-world/destructive annotation', () => {
  if (!fs.existsSync(BUNDLE_PATH)) {
    const why =
      'mcp-server/dist/index.js is absent — build it with `cd mcp-server && npm install && npm run build`';
    assert.ok(
      !REQUIRE_BUNDLE,
      `MF_REQUIRE_MCP_BUNDLE=1 demands this check, but ${why}`,
    );
    console.log(`\n  !  NOT RUN: ${why}\n`);
    return 'SKIP: ' + why;
  }
  const { replies, diagnostics } = callServer(BUNDLE_PATH, [
    INIT,
    INITIALIZED,
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  ]);
  const list = replies.find((r) => r.id === 2);
  assert.ok(
    list && list.result && Array.isArray(list.result.tools),
    `tools/list did not return a tools array (${diagnostics})`,
  );
  const browse = list.result.tools.find((t) => t.name === 'mindforge_browse');
  assert.ok(browse, 'mindforge_browse must be registered as an MCP tool');
  assert.strictEqual(
    browse.annotations.readOnlyHint,
    false,
    'mindforge_browse is not read-only',
  );
  assert.strictEqual(
    browse.annotations.destructiveHint,
    true,
    'mindforge_browse can mutate a live page',
  );
  assert.strictEqual(
    browse.annotations.openWorldHint,
    true,
    'mindforge_browse reaches arbitrary URLs, unlike the other 7 tools',
  );
  assert.strictEqual(
    list.result.tools.length,
    8,
    `expected 8 registered tools, found ${list.result.tools.length}`,
  );
});

test('tools/call mindforge_browse action=status degrades gracefully with no daemon running', () => {
  if (!fs.existsSync(BUNDLE_PATH))
    return 'SKIP: mcp-server/dist/index.js is absent';
  const { replies, diagnostics } = callServer(BUNDLE_PATH, [
    INIT,
    INITIALIZED,
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'mindforge_browse', arguments: { action: 'status' } },
    },
  ]);
  const call = replies.find((r) => r.id === 3);
  assert.ok(
    call && call.result,
    `tools/call did not return a result (${diagnostics})`,
  );
  assert.strictEqual(
    call.result.isError,
    true,
    'must report isError when the daemon is not running',
  );
  const text = call.result.content[0].text;
  assert.ok(
    text.includes('browser daemon is not running'),
    `error text must explain the daemon is not running, got: ${text}`,
  );
  assert.ok(
    text.includes('/mindforge:browse --start'),
    `error text must point at the fix, got: ${text}`,
  );
});

test('tools/call rejects action="evaluate" at the schema boundary (not exposed)', () => {
  if (!fs.existsSync(BUNDLE_PATH))
    return 'SKIP: mcp-server/dist/index.js is absent';
  const { replies, diagnostics } = callServer(BUNDLE_PATH, [
    INIT,
    INITIALIZED,
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'mindforge_browse',
        arguments: { action: 'evaluate', script: '1+1' },
      },
    },
  ]);
  const call = replies.find((r) => r.id === 4);
  assert.ok(call && call.result, `no result for id 4 (${diagnostics})`);
  assert.strictEqual(
    call.result.isError,
    true,
    'action="evaluate" must be rejected, not silently accepted',
  );
  assert.ok(
    call.result.content[0].text.includes('invalid_enum_value'),
    `expected a zod enum validation error, got: ${call.result.content[0].text}`,
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
    `\nMCP Browse Tool: ${passed} passed, ${failed} failed, ${skipped} skipped`,
  );
  if (failed > 0) process.exit(1);
})();
