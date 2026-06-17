/**
 * MindForge — Reciprocal Rank Fusion Tests (UC-20)
 * Validates RRF merge correctness: items in multiple lists rank higher.
 */

'use strict';

const assert = require('assert');
const path = require('path');

const { fuseResults, K } = require(path.join(__dirname, '..', 'bin', 'memory', 'retrieval-fusion'));

console.log('\nMindForge — Reciprocal Rank Fusion Tests (UC-20)\n');

// ── Tests ────────────────────────────────────────────────────────────────────

// Test 1: Item in multiple lists ranks higher than item in one list
console.log('Test 1: Item in multiple lists ranks higher than single-list item...');
{
  const list1 = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
  const list2 = [{ id: 'B' }, { id: 'D' }, { id: 'A' }];
  const fused = fuseResults([list1, list2]);
  const ranks = Object.fromEntries(fused.map((item, i) => [item.id, i]));

  assert.ok(ranks.B < ranks.C, 'B (in both lists) should rank above C (in one list)');
  assert.ok(ranks.A < ranks.D, 'A (in both lists, different ranks) should rank above D (in one only)');
  console.log('  PASS: Multi-list items rank higher');
}

// Test 2: RRF formula produces correct scores
console.log('Test 2: RRF formula correctness...');
{
  const list1 = [{ id: 'X' }]; // rank 0 → contribution 1/(60+1) = 1/61
  const list2 = [{ id: 'X' }]; // rank 0 → contribution 1/(60+1) = 1/61
  const fused = fuseResults([list1, list2]);

  const expected = 2 * (1 / (K + 1));
  const actual = fused[0].rrfScore;
  assert.ok(Math.abs(actual - expected) < 1e-10, `Expected ${expected}, got ${actual}`);
  console.log('  PASS: RRF score = 2/(K+1) for item at rank 0 in both lists');
}

// Test 3: Single list produces correct ordering
console.log('Test 3: Single list preserves ordering...');
{
  const list1 = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
  const fused = fuseResults([list1]);

  assert.strictEqual(fused[0].id, 'A');
  assert.strictEqual(fused[1].id, 'B');
  assert.strictEqual(fused[2].id, 'C');
  assert.ok(fused[0].rrfScore > fused[1].rrfScore, 'First item has higher score');
  assert.ok(fused[1].rrfScore > fused[2].rrfScore, 'Second item has higher score than third');
  console.log('  PASS: Single list ordering preserved');
}

// Test 4: Empty lists handled gracefully
console.log('Test 4: Empty lists handled gracefully...');
{
  assert.deepStrictEqual(fuseResults([]), [], 'Empty array of lists returns empty');
  assert.deepStrictEqual(fuseResults([[], []]), [], 'Array of empty lists returns empty');
  assert.deepStrictEqual(fuseResults(null), [], 'null returns empty');
  assert.deepStrictEqual(fuseResults(undefined), [], 'undefined returns empty');
  console.log('  PASS: Empty/null inputs handled');
}

// Test 5: K constant is 60
console.log('Test 5: K constant is 60...');
{
  assert.strictEqual(K, 60, 'K should be 60 (standard RRF constant)');
  console.log('  PASS: K=60');
}

// Test 6: Items retain original properties from first occurrence
console.log('Test 6: Items retain original properties...');
{
  const list1 = [{ id: 'A', content: 'hello', tags: ['x'] }];
  const list2 = [{ id: 'A', content: 'different', tags: ['y'] }];
  const fused = fuseResults([list1, list2]);

  assert.strictEqual(fused[0].content, 'hello', 'Should retain properties from first list');
  assert.deepStrictEqual(fused[0].tags, ['x'], 'Tags from first occurrence');
  console.log('  PASS: Properties from first occurrence retained');
}

// Test 7: Three lists (simulating 3 retrieval paths)
console.log('Test 7: Three-list fusion (knowledge-graph + indexer + FTS)...');
{
  // Simulate: knowledge-graph ranked by embedding+traversal
  const graphList = [
    { id: 'doc1', source: 'graph' },
    { id: 'doc3', source: 'graph' },
    { id: 'doc5', source: 'graph' },
  ];
  // Simulate: BM25 indexer ranked by text relevance
  const indexerList = [
    { id: 'doc2', source: 'indexer' },
    { id: 'doc1', source: 'indexer' },
    { id: 'doc4', source: 'indexer' },
  ];
  // Simulate: FTS4 ranked by full-text search
  const ftsList = [
    { id: 'doc1', source: 'fts' },
    { id: 'doc4', source: 'fts' },
    { id: 'doc3', source: 'fts' },
  ];

  const fused = fuseResults([graphList, indexerList, ftsList]);
  const ranks = Object.fromEntries(fused.map((item, i) => [item.id, i]));

  // doc1 appears in ALL 3 lists → should be ranked #1
  assert.strictEqual(ranks.doc1, 0, 'doc1 (in all 3 lists) should be ranked first');
  // doc3 appears in 2 lists (graph + fts), doc4 in 2 lists (indexer + fts)
  // doc3: rank 1 in graph (1/(61+1)=1/62) + rank 2 in fts (1/(60+3)=1/63) = 0.01613+0.01587 = 0.032
  // doc4: rank 2 in indexer (1/63) + rank 1 in fts (1/62) = 0.01587+0.01613 = 0.032
  // They have the same score with different rank distributions — both above single-list items
  assert.ok(ranks.doc3 < ranks.doc5, 'doc3 (in 2 lists) should rank above doc5 (in 1 list)');
  assert.ok(ranks.doc4 < ranks.doc5, 'doc4 (in 2 lists) should rank above doc5 (in 1 list)');
  console.log('  PASS: Three-list fusion produces correct priority order');
}

// Test 8: RRF score decreases with rank position
console.log('Test 8: RRF score decreases monotonically with rank...');
{
  const items = Array.from({ length: 10 }, (_, i) => ({ id: `item${i}` }));
  const fused = fuseResults([items]);

  for (let i = 0; i < fused.length - 1; i++) {
    assert.ok(
      fused[i].rrfScore > fused[i + 1].rrfScore,
      `Score at rank ${i} should exceed rank ${i + 1}`
    );
  }
  console.log('  PASS: Monotonically decreasing RRF scores');
}

// Test 9: Large lists — items at bottom of lists get minimal boost
console.log('Test 9: Bottom-ranked items get minimal score...');
{
  const bigList = Array.from({ length: 100 }, (_, i) => ({ id: `big${i}` }));
  const fused = fuseResults([bigList]);

  const firstScore = fused[0].rrfScore;  // 1/(60+1) = 0.01639
  const lastScore = fused[99].rrfScore;   // 1/(60+100) = 0.00625

  assert.ok(firstScore > lastScore * 2, 'First item score should be >2x last item score');
  console.log('  PASS: Bottom items get appropriately low scores');
}

// Test 10: Items with null/undefined id are skipped
console.log('Test 10: Items without id are skipped...');
{
  const list = [{ id: 'A' }, { name: 'no-id' }, { id: null }, { id: 'B' }];
  const fused = fuseResults([list]);
  const ids = fused.map(item => item.id);
  assert.deepStrictEqual(ids, ['A', 'B'], 'Only items with valid id are included');
  console.log('  PASS: Invalid items skipped');
}

console.log('\n All Reciprocal Rank Fusion Tests Passed!\n');
