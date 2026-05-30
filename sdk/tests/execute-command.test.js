/**
 * MindForge SDK — executeCommand real-process regression test (UC-07a)
 * Tests the COMPILED dist build (not a mock) to prove a real child process ran.
 * Run: node sdk/tests/execute-command.test.js   (after `cd sdk && npm run build`)
 */
'use strict';
const assert = require('assert');
const path   = require('path');

let passed = 0, failed = 0;
function test(name, fn) {
  Promise.resolve()
    .then(fn)
    .then(() => { console.log(`  ✅  ${name}`); passed++; })
    .catch(e => { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; })
    .finally(() => { if (passed + failed === TOTAL) finish(); });
}
const TOTAL = 3;
function finish() {
  console.log(`\nexecuteCommand: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

const { MindForgeClient } = require(path.resolve(__dirname, '..', 'dist', 'index.js'));
const client = new MindForgeClient({ projectRoot: path.resolve(__dirname, '..', '..') });

test('batchExecute runs a real process and captures stdout', async () => {
  const res = await client.batchExecute({
    tasks: [{ id: 't1', command: 'node', options: { args: ['-e', 'process.stdout.write(\'REAL_OUTPUT\')'] } }],
    maxConcurrency: 1,
  });
  const t1 = res.results.find(r => r.taskId === 't1');
  assert.strictEqual(t1.status, 'fulfilled', 'task should be fulfilled');
  assert.ok(t1.result && /REAL_OUTPUT/.test(t1.result.stdout),
    `stdout must contain real process output, got: ${JSON.stringify(t1.result)}`);
  assert.strictEqual(t1.result.exitCode, 0, 'exit code should be 0');
});

test('non-zero exit code is surfaced, not silently fulfilled', async () => {
  const res = await client.batchExecute({
    tasks: [{ id: 't2', command: 'node', options: { args: ['-e', 'process.exit(3)'] } }],
    maxConcurrency: 1,
  });
  const t2 = res.results.find(r => r.taskId === 't2');
  const ok = (t2.status === 'rejected') ||
             (t2.status === 'fulfilled' && t2.result && t2.result.exitCode === 3);
  assert.ok(ok, `non-zero exit must be observable, got: ${JSON.stringify(t2)}`);
});

test('executeCommand result never returns the old {executed:true} stub shape', async () => {
  const res = await client.batchExecute({
    tasks: [{ id: 't3', command: 'node', options: { args: ['-e', '0'] } }],
    maxConcurrency: 1,
  });
  const t3 = res.results.find(r => r.taskId === 't3');
  if (t3.status === 'fulfilled') {
    assert.ok(!(t3.result && t3.result.executed === true && t3.result.exitCode === undefined),
      'result must not be the legacy no-op stub {executed:true}');
  }
});
