/**
 * MindForge Context Compaction Tests
 * Run: node tests/compaction.test.js
 */

const fs = require('fs');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Compaction state validator ─────────────────────────────────────────────────

function validateHandoffJson(obj) {
  const required = ['schema_version', 'next_task', '_warning', 'context_refs'];
  const missing = required.filter(f => obj[f] === undefined);
  if (missing.length > 0) throw new Error(`Missing: ${missing.join(', ')}`);
  if (!Array.isArray(obj.context_refs)) throw new Error('context_refs must be an array');
  if (!Array.isArray(obj.blockers)) throw new Error('blockers must be an array');
  if (obj._warning.toLowerCase().includes('password') === false &&
      obj._warning.toLowerCase().includes('secret') === false) {
    throw new Error('_warning must mention secrets/passwords');
  }
}

function validateStateHasCompactionCheckpoint(content) {
  return content.includes('Compaction checkpoint') || content.includes('compaction');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nMindForge Day 2 — Context Compaction Tests\n');

console.log('HANDOFF.json schema validation:');

test('HANDOFF.json exists', () => {
  assert.ok(fs.existsSync('.planning/HANDOFF.json'));
});

test('HANDOFF.json is valid JSON', () => {
  const content = fs.readFileSync('.planning/HANDOFF.json', 'utf8');
  assert.doesNotThrow(() => JSON.parse(content));
});

test('HANDOFF.json has all required fields', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  validateHandoffJson(obj);
});

test('HANDOFF.json schema_version is 1.0.0', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.strictEqual(obj.schema_version, '1.0.0');
});

test('HANDOFF.json context_refs is an array', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok(Array.isArray(obj.context_refs));
});

test('HANDOFF.json blockers is an array', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok(Array.isArray(obj.blockers));
});

test('HANDOFF.json decisions_needed is an array', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok(Array.isArray(obj.decisions_needed));
});

console.log('\nCompaction protocol file:');

test('compaction-protocol.md exists', () => {
  assert.ok(
    fs.existsSync('.mindforge/engine/compaction-protocol.md'),
    'compaction-protocol.md not found'
  );
});

test('compaction-protocol.md mentions 70% threshold', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(content.includes('70%'), 'Should specify 70% compaction threshold');
});

test('compaction-protocol.md has all 6 steps', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(content.includes('Step 1'), 'Missing Step 1');
  assert.ok(content.includes('Step 2'), 'Missing Step 2');
  assert.ok(content.includes('Step 3'), 'Missing Step 3');
  assert.ok(content.includes('Step 4'), 'Missing Step 4');
  assert.ok(content.includes('Step 5'), 'Missing Step 5');
  assert.ok(content.includes('Step 6'), 'Missing Step 6');
});

test('compaction-protocol.md covers session restart procedure', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(
    content.includes('Session restart') || content.includes('restart from HANDOFF'),
    'Should cover session restart from HANDOFF.json'
  );
});

console.log('\nAdditional compaction tests:');

test('HANDOFF.json has recent_commits field', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok('recent_commits' in obj, 'Missing recent_commits field');
  assert.ok(Array.isArray(obj.recent_commits), 'recent_commits must be an array');
});

test('HANDOFF.json has recent_files field', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok('recent_files' in obj, 'Missing recent_files field');
  assert.ok(Array.isArray(obj.recent_files), 'recent_files must be an array');
});

test('compaction-protocol.md covers WIP commit with --no-verify', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(
    content.includes('--no-verify') || content.includes('no-verify'),
    'Should mention --no-verify for WIP commits that bypass hooks'
  );
});

test('compaction-protocol.md covers staleness detection', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(
    content.includes('48 hours') || content.includes('staleness') || content.includes('stale'),
    'Should cover HANDOFF.json staleness detection'
  );
});

test('compaction-protocol.md mentions 85% emergency compaction', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(
    content.includes('85%') || content.includes('emergency'),
    'Should cover emergency compaction when 85%+ context is reached'
  );
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All compaction tests passed.\n`);
}
