/**
 * MindForge v2 — Memory Test Suite
 * Tests the Persistent Knowledge Graph (Store, Indexer, Capture, Sync).
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const assert = require('assert');

const Store    = require('../bin/memory/knowledge-store');
const Indexer  = require('../bin/memory/knowledge-indexer');
const Capture  = require('../bin/memory/knowledge-capture');
const Loader   = require('../bin/memory/session-memory-loader');
const Sync     = require('../bin/memory/global-sync');

// ── Test Environment Setup ────────────────────────────────────────────────────
const TEST_DIR = path.join(process.cwd(), '.mindforge-test-memory');
const TEST_KB  = path.join(TEST_DIR, 'knowledge-base.jsonl');

function setup() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  // Mock Store paths for testing
  Store.setBaseDir(TEST_DIR);
  Store.setGlobalDir(TEST_DIR);
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testKnowledgeStore() {
  console.log('  Testing Knowledge Store...');
  setup();

  // 1. Add entry
  const id = Store.add({
    type: 'team_preference',
    topic: 'Use Tailwind',
    content: 'Always use Tailwind for CSS.',
    confidence: 0.9,
    tags: ['ui', 'css'],
  });
  assert.ok(id, 'Should return an ID');

  // 2. Read entries
  const all = Store.readAll();
  assert.strictEqual(all.length, 1, 'Should have 1 entry');
  assert.strictEqual(all[0].topic, 'Use Tailwind');

  // 3. Reinforce
  Store.reinforce(id);
  const reinforced = Store.readAll()[0];
  assert.strictEqual(reinforced.times_referenced, 1);
  assert.ok(reinforced.confidence > 0.9);

  // 4. Deprecate
  Store.deprecate(id, 'Switching to Vanilla CSS');
  const deprecated = Store.readAll()[0];
  assert.strictEqual(deprecated.deprecated, true);
  assert.strictEqual(deprecated.deprecated_reason, 'Switching to Vanilla CSS');

  console.log('  ✅ Knowledge Store passed');
}

async function testKnowledgeIndexer() {
  console.log('  Testing Knowledge Indexer...');
  setup();

  Store.add({ type: 'domain_knowledge', topic: 'Auth with JWT', content: 'Secure JWT with httpOnly cookies.', confidence: 0.8, tags: ['auth'] });
  Store.add({ type: 'domain_knowledge', topic: 'Database SQL', content: 'Use indexed columns for fast queries.', confidence: 0.7, tags: ['db'] });
  Store.add({ type: 'code_pattern', topic: 'React Memo', content: 'Use React.memo for UI optimization to prevent re-renders.', confidence: 0.6, tags: ['ui'] });

  // 1. Tokenizer
  const tokens = Indexer.tokenize('How to secure JWT in React?');
  assert.ok(tokens.includes('secure'), 'Should include "secure"');
  assert.ok(tokens.includes('jwt'), 'Should include "jwt"');
  assert.ok(!tokens.includes('how'), 'Should exclude stopword "how"');

  // 2. Search
  const results = Indexer.search('jwt security');
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].topic, 'Auth with JWT');

  const uiResults = Indexer.search('optimization', { tags: ['ui'] });
  assert.strictEqual(uiResults.length, 1);
  assert.strictEqual(uiResults[0].topic, 'React Memo');

  console.log('  ✅ Knowledge Indexer passed');
}

async function testKnowledgeCapture() {
  console.log('  Testing Knowledge Capture...');
  setup();

  // 1. Infer tags
  const tags = Capture.inferTagsFromText('Using postgres and prisma for the database.');
  assert.ok(tags.includes('database'), 'Should infer "database"');

  // 2. Mock ADR capture
  // (In real test we'd write files, here let's test a helper)
  const entry = { type: 'architectural_decision', topic: 'ADR-001', content: 'Decision content', confidence: 0.9 };
  const result = Capture.deduplicateOrAdd(entry);
  assert.strictEqual(result.action, 'added');

  // Deduplicate case
  const result2 = Capture.deduplicateOrAdd(entry);
  assert.strictEqual(result2.action, 'reinforced');

  console.log('  ✅ Knowledge Capture passed');
}

async function testSessionMemoryLoader() {
  console.log('  Testing Session Memory Loader...');
  setup();

  Store.add({ type: 'team_preference', topic: 'Lang', content: 'Use TypeScript only.', confidence: 0.9 });
  
  const result = Loader.loadForSession({ techStack: ['typescript'], topic: 'setup' });
  assert.ok(result.count >= 1);
  assert.ok(result.formatted.includes('Team Preferences'));
  assert.ok(result.formatted.includes('Use TypeScript only'));

  console.log('  ✅ Session Memory Loader passed');
}

async function testGlobalSync() {
  console.log('  Testing Global Sync...');
  setup();

  const id = Store.add({ type: 'domain_knowledge', topic: 'Global Tip', content: 'Always fix lints.', confidence: 0.8 });
  
  // Promotion
  const result = Sync.promote(id);
  const globalPath = Store.getPaths().GLOBAL_KB_PATH;
  assert.ok(fs.existsSync(globalPath), 'Global file should exist');

  const stats = Sync.globalStats();
  assert.strictEqual(stats.total, 1);

  console.log('  ✅ Global Sync passed');
}

async function runAll() {
  console.log('--- MindForge Persistent Memory Test Suite ---');
  try {
    await testKnowledgeStore();
    await testKnowledgeIndexer();
    await testKnowledgeCapture();
    await testSessionMemoryLoader();
    await testGlobalSync();
    console.log('\n--- All Memory Tests Passed! ---');
    cleanup();
  } catch (err) {
    console.error('\n❌ Test failed:');
    console.error(err);
    cleanup();
    process.exit(1);
  }
}

runAll();
