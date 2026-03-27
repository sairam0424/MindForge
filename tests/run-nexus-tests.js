const fs = require('fs');
const path = require('path');
const NexusTracer = require('../.mindforge/engine/nexus-tracer');

const auditPath = path.join(__dirname, '../.planning/AUDIT.jsonl');

const cleanup = () => {
  if (fs.existsSync(auditPath)) {
    fs.truncateSync(auditPath, 0);
  }
};

const runTest = (name, fn) => {
  try {
    cleanup();
    fn();
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
};

const tracer = new NexusTracer();

runTest('Initialize Span', () => {
  tracer.startTrace();
  const spanId = tracer.startSpan('test_wave_01');
  const span = tracer.activeSpans.get(spanId);
  if (!span.trace_id || !span.id || span.name !== 'test_wave_01') {
    throw new Error('Invalid span initialization');
  }
});

runTest('Hierarchical Spans', () => {
  tracer.startTrace();
  const parentId = tracer.startSpan('parent');
  const childId = tracer.startSpan('child', {}, parentId);
  const parent = tracer.activeSpans.get(parentId);
  const child = tracer.activeSpans.get(childId);
  if (child.trace_id !== parent.trace_id || child.parent_id !== parent.id) {
    throw new Error('Span hierarchy failed');
  }
});

runTest('Record Reasoning', () => {
  tracer.startTrace();
  const spanId = tracer.startSpan('reasoning_task');
  tracer.recordReasoning(spanId, 'test-agent', 'Considering memory safety');
  const logs = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
  const lastEntry = JSON.parse(logs[logs.length - 1]);
  if (lastEntry.event !== 'reasoning_trace' || !lastEntry.thought.includes('memory safety')) {
    throw new Error('Reasoning trace recording failed');
  }
});

runTest('Close Spans', () => {
  tracer.startTrace();
  const spanId = tracer.startSpan('closing_task');
  tracer.endSpan(spanId);
  if (tracer.activeSpans.has(spanId)) {
    throw new Error('Span closing failed');
  }
});

console.log('\n🚀 ALL NEXUS TRACING TESTS PASSED');
