'use strict';
const assert = require('assert');
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('recallAtK computes correct recall for simple case', () => {
  const { recallAtK } = require('../bin/eval/eval-harness');
  const retrieved = ['a', 'b', 'c', 'd', 'e'];
  const relevant = ['a', 'c', 'f'];
  const recall = recallAtK(retrieved, relevant, 5);
  assert.strictEqual(recall, 2/3);
});

test('recallAtK returns 0 when nothing relevant retrieved', () => {
  const { recallAtK } = require('../bin/eval/eval-harness');
  assert.strictEqual(recallAtK(['x', 'y'], ['a', 'b'], 2), 0);
});

test('recallAtK returns 1 when all relevant items retrieved', () => {
  const { recallAtK } = require('../bin/eval/eval-harness');
  assert.strictEqual(recallAtK(['a', 'b', 'c'], ['a', 'b'], 3), 1);
});

test('ndcg computes correct nDCG for graded relevance', () => {
  const { ndcg } = require('../bin/eval/eval-harness');
  const retrieved = ['a', 'b', 'c'];
  const relevanceMap = { a: 3, b: 0, c: 2 };
  const score = ndcg(retrieved, relevanceMap, 3);
  assert.ok(score >= 0 && score <= 1, 'nDCG must be in [0,1], got ' + score);
  assert.ok(score > 0.5, 'with relevant items at top, nDCG should be > 0.5');
});

test('ndcg returns 0 for completely irrelevant results', () => {
  const { ndcg } = require('../bin/eval/eval-harness');
  const retrieved = ['x', 'y', 'z'];
  const relevanceMap = { a: 3, b: 2 };
  assert.strictEqual(ndcg(retrieved, relevanceMap, 3), 0);
});

test('runEval executes golden set and returns aggregate metrics', async () => {
  const { runEval } = require('../bin/eval/eval-harness');
  const goldenSet = [
    { query: 'authentication flow', relevant: ['auth-design', 'jwt-impl'] },
    { query: 'database schema', relevant: ['schema-v2', 'migration-plan'] },
  ];
  const mockRetriever = (query) => {
    if (query.includes('auth')) return ['auth-design', 'other', 'jwt-impl'];
    return ['schema-v2', 'unrelated'];
  };
  const metrics = await runEval({ goldenSet, retriever: mockRetriever, k: 5 });
  assert.ok(typeof metrics.meanRecallAtK === 'number');
  assert.ok(typeof metrics.meanNDCG === 'number');
  assert.ok(metrics.perQuery.length === 2);
  assert.ok(metrics.meanRecallAtK > 0);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nEval Harness: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
