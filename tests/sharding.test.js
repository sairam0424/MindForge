/**
 * MindForge Sharding & Tri-Tier Memory Tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SHARD_HELPER = 'node bin/shard-helper.js';

// Setup Mock Data
const mockHandoff = {
  schema_version: "2.1.0",
  hot_context: {
    active_decisions: [
      { id: "ADR-001", topic: "Use Kafka", content: "Architecture decision to use Kafka for messaging." },
      { id: "DESC-002", topic: "Typo in README", content: "Minor fix for a typo." }
    ],
    recent_discoveries: [
      { id: "DISC-001", topic: "Auth latency", content: "Auth service is slow due to DB indexing." }
    ]
  }
};

const mockShardDir = '.planning/memories/';
if (!fs.existsSync(mockShardDir)) fs.mkdirSync(mockShardDir, { recursive: true });

const mockShardLine = JSON.stringify({ id: "WARM-001", topic: "Database Schema", content: "The user table has been updated with a new email field." });
fs.writeFileSync(path.join(mockShardDir, 'WARM-SHARD-TEST.jsonl'), mockShardLine + '\n');

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nMindForge V3 — Sharding Tests\n');

try {
  // Test 1: SRD Analysis
  console.log('Test 1: SRD Analysis...');
  const tempHandoff = 'temp-handoff.json';
  fs.writeFileSync(tempHandoff, JSON.stringify(mockHandoff));
  
  const analysisOutput = execSync(`${SHARD_HELPER} --analyse ${tempHandoff}`).toString();
  const scored = JSON.parse(analysisOutput);
  
  assert.ok(scored.length === 3, 'Should score all 3 mock items');
  assert.ok(scored[0].id === 'ADR-001', 'ADR should have highest SRD');
  assert.ok(scored[0].checksum, 'Should generate checksum');
  assert.ok(scored[0].tags.includes('kafka'), 'Should generate semantic tags');
  
  console.log('  ✅ SRD Analysis & Hardening (Tags/Checksums) passed');

  // Test 2: Integrity Verification
  console.log('Test 2: Integrity Verification...');
  const shardPath = path.join(mockShardDir, 'INTEGRITY-TEST.jsonl');
  const validItem = JSON.parse(JSON.stringify(scored[0]));
  fs.writeFileSync(shardPath, JSON.stringify(validItem) + '\n');
  
  const verifyOutput = execSync(`${SHARD_HELPER} --verify ${shardPath}`).toString();
  assert.ok(verifyOutput.includes('verified'), 'Should verify valid shard');
  
  console.log('  ✅ Integrity Verification passed');

  // Test 2: Semantic Retrieval
  console.log('Test 2: Semantic Retrieval...');
  const retrievalOutput = execSync(`${SHARD_HELPER} --retrieve "database email"`).toString();
  const retrieved = JSON.parse(retrievalOutput);
  
  assert.ok(retrieved.length > 0, 'Should retrieve relevant shard');
  assert.ok(retrieved[0].topic === 'Database Schema', 'Should match database keyword');
  
  console.log('  ✅ Semantic Retrieval passed');

  // Test 3: Empty retrieval
  console.log('Test 3: Empty Retrieval...');
  const emptyOutput = execSync(`${SHARD_HELPER} --retrieve "nonexistent keyword"`).toString();
  const emptyRetrieved = JSON.parse(emptyOutput);
  assert.strictEqual(emptyRetrieved.length, 0, 'Should return empty array for no match');
  console.log('  ✅ Empty Retrieval passed');

  fs.unlinkSync(tempHandoff);
  console.log('\n✅ All Sharding Tests Passed!\n');

} catch (err) {
  console.error('\n❌ Sharding Tests Failed:');
  console.error(err.message);
  process.exit(1);
}
