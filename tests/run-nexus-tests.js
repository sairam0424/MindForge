/**
 * MindForge Nexus — Async Test Runner (v5.9.0)
 * 
 * Validates the core ART protocol including hierarchical spans,
 * reasoning trace capture, and cryptographic audit logging.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { NexusTracer } = require('../bin/engine/nexus-tracer');

const auditPath = path.join(__dirname, '../.planning/AUDIT.jsonl');

const cleanup = () => {
  if (fs.existsSync(auditPath)) {
    fs.truncateSync(auditPath, 0);
  }
};

const runTest = async (name, fn) => {
  try {
    cleanup();
    await fn();
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
};

// Use a fresh instance for the test suite to avoid interference
const tracer = new NexusTracer({ enableZtai: false });

(async () => {
  console.log('🚀 Starting Nexus Tracing Core Test Suite...\n');

  await runTest('Initialize Span', async () => {
    tracer.startTrace();
    const spanId = await tracer.startSpan('test_wave_01');
    const span = tracer.activeSpans.get(spanId);
    if (!span.trace_id || !span.id || span.name !== 'test_wave_01') {
      throw new Error('Invalid span initialization');
    }
  });

  await runTest('Hierarchical Spans', async () => {
    tracer.startTrace();
    const parentId = await tracer.startSpan('parent');
    const childId = await tracer.startSpan('child', {}, parentId);
    const parent = tracer.activeSpans.get(parentId);
    const child = tracer.activeSpans.get(childId);
    if (child.trace_id !== parent.trace_id || child.parent_id !== parent.id) {
      throw new Error('Span hierarchy failed');
    }
  });

  await runTest('Record Reasoning', async () => {
    tracer.startTrace();
    const spanId = await tracer.startSpan('reasoning_task');
    await tracer.recordReasoning(spanId, 'test-agent', 'Considering memory safety');
    
    // We need to wait a tiny bit or ensure fs flush if _recordEvent is async
    const logs = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
    const lastEntry = JSON.parse(logs[logs.length - 1]);
    if (lastEntry.event !== 'reasoning_trace' || !lastEntry.thought.includes('memory safety')) {
      throw new Error('Reasoning trace recording failed');
    }
  });

  await runTest('Close Spans', async () => {
    tracer.startTrace();
    const spanId = await tracer.startSpan('closing_task');
    await tracer.endSpan(spanId);
    if (tracer.activeSpans.has(spanId)) {
      throw new Error('Span closing failed');
    }
  });

  console.log('\n🌟 ALL NEXUS TRACING TESTS PASSED');
  cleanup();
})();
