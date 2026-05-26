/**
 * MindForge — Nexus Tracer & ART Protocol Tests
 * Run: node tests/nexus-tracing.test.js
 */

const fs = require('fs');
const path = require('path');
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

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function run() {
  // Import the NexusTracer class (not the singleton) to avoid side effects
  const { NexusTracer } = require('../bin/engine/nexus-tracer');

  const auditDir = path.join(__dirname, '..', '.planning');
  const auditPath = path.join(auditDir, 'AUDIT-TEST.jsonl');

  // Create a fresh tracer instance for testing
  const tracer = new NexusTracer({
    auditPath,
    enableZtai: false,
  });

  // Ensure clean state
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }
  if (fs.existsSync(auditPath)) {
    fs.truncateSync(auditPath, 0);
  }

  console.log('\nNexus Tracer & ART Protocol Tests\n');

  // ── Trace initialization ─────────────────────────────────────────────────────
  console.log('Trace initialization:');

  test('startTrace returns a valid trace ID', () => {
    const traceId = tracer.startTrace();
    assert.ok(traceId, 'Trace ID should be defined');
    assert.ok(traceId.startsWith('tr_'), 'Trace ID should start with "tr_"');
    assert.strictEqual(tracer.currentTraceId, traceId);
  });

  // ── Span lifecycle ───────────────────────────────────────────────────────────
  console.log('\nSpan lifecycle:');

  await asyncTest('startSpan returns a valid span ID', async () => {
    tracer.startTrace();
    const spanId = await tracer.startSpan('test_wave_01');
    assert.ok(spanId, 'Span ID should be defined');
    assert.ok(spanId.startsWith('sp_'), 'Span ID should start with "sp_"');
    assert.ok(tracer.activeSpans.has(spanId), 'Span should be in activeSpans');
  });

  await asyncTest('span has correct properties', async () => {
    tracer.startTrace();
    const spanId = await tracer.startSpan('test_task');
    const span = tracer.activeSpans.get(spanId);
    assert.strictEqual(span.name, 'test_task');
    assert.strictEqual(span.trace_id, tracer.currentTraceId);
    assert.strictEqual(span.status, 'active');
    assert.ok(span.start_time, 'Span should have start_time');
  });

  await asyncTest('supports hierarchical spans (parent-child)', async () => {
    tracer.startTrace();
    const parentId = await tracer.startSpan('parent');
    const childId = await tracer.startSpan('child', {}, parentId);

    const child = tracer.activeSpans.get(childId);
    assert.strictEqual(child.trace_id, tracer.currentTraceId);
    assert.strictEqual(child.parent_id, parentId);
  });

  await asyncTest('endSpan removes span from activeSpans', async () => {
    tracer.startTrace();
    const spanId = await tracer.startSpan('closing_task');
    assert.ok(tracer.activeSpans.has(spanId), 'Span should exist before closing');

    await tracer.endSpan(spanId);
    assert.ok(!tracer.activeSpans.has(spanId), 'Span should be removed after endSpan');
  });

  // ── Reasoning trace recording ────────────────────────────────────────────────
  console.log('\nReasoning trace recording:');

  await asyncTest('recordReasoning writes to AUDIT file', async () => {
    // Ensure file exists for truncation
    fs.writeFileSync(auditPath, '');

    tracer.startTrace();
    const spanId = await tracer.startSpan('reasoning_task');
    await tracer.recordReasoning(spanId, 'test-agent', 'Considering memory safety in Rust vs C++');

    // Flush the async audit writer so data is on disk
    if (tracer._auditWriter && tracer._auditWriter.flush) {
      await tracer._auditWriter.flush();
    }

    const logs = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
    assert.ok(logs.length > 0, 'Audit log should have entries');

    const lastEntry = JSON.parse(logs[logs.length - 1]);
    assert.strictEqual(lastEntry.event, 'reasoning_trace');
    assert.ok(lastEntry.thought.includes('memory safety'), 'Thought should contain original text');
    assert.strictEqual(lastEntry.trace_id, tracer.currentTraceId);
  });

  // ── Entropy calculation ──────────────────────────────────────────────────────
  console.log('\nEntropy calculation:');

  test('first thought has zero entropy', () => {
    tracer.entropyCache.clear();
    const entropy = tracer.calculateEntropy('span_entropy_test', 'This is a completely new thought');
    assert.strictEqual(entropy, 0);
  });

  test('repeated thought has high entropy', () => {
    tracer.entropyCache.clear();
    tracer.calculateEntropy('span_repeat', 'The quick brown fox jumps over the lazy dog');
    const entropy = tracer.calculateEntropy('span_repeat', 'The quick brown fox jumps over the lazy dog');
    assert.ok(entropy > 0.8, `Expected high entropy for repeated thought, got ${entropy}`);
  });

  test('different thought has lower entropy', () => {
    tracer.entropyCache.clear();
    tracer.calculateEntropy('span_diff', 'Designing database schema for user accounts');
    const entropy = tracer.calculateEntropy('span_diff', 'Implementing WebSocket connection pooling');
    assert.ok(entropy < 0.5, `Expected low entropy for different thought, got ${entropy}`);
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  if (fs.existsSync(auditPath)) {
    fs.unlinkSync(auditPath);
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} test(s) failed.\n`);
    process.exit(1);
  } else {
    console.log('\n✅ All nexus-tracing tests passed.\n');
  }
}

run().catch(err => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
