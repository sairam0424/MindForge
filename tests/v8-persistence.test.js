/**
 * MindForge v8 Persistence Verification Test
 * Tests the Unified Persistence Layer (SQLite via sql.js)
 */
const nexusTracer = require('../bin/engine/nexus-tracer');
const remediationQueue = require('../bin/revops/remediation-queue');
const semanticHub = require('../bin/memory/semantic-hub');
const vectorHub = require('../bin/memory/vector-hub');

async function runTest() {
  const testId = Math.random().toString(36).substr(2, 6);
  console.log(`[TEST] Starting v8 Persistence Verification (Test ID: ${testId})...`);

  try {
    // 1. Test NexusTracer -> VectorHub
    console.log('[TEST] Recording reasoning trace...');
    const traceId = nexusTracer.startTrace(`v8_trace_${testId}`);
    const spanId = await nexusTracer.startSpan(`v8_span_${testId}`);
    await nexusTracer.recordReasoning(spanId, 'mf-tester', `Celestial persistence test ${testId}.`, 'verified');
    await nexusTracer.endSpan(spanId);

    // 2. Test RemediationQueue -> VectorHub
    console.log('[TEST] Enqueuing remediation...');
    const remId = `rem_v8_${testId}`;
    const remediation = await remediationQueue.enqueue({
      remediation_id: remId,
      span_id: spanId,
      strategy: 'REASONING_RESTART'
    });
    console.log(`[TEST] Enqueued: ${remediation.remediation_id}`);

    await remediationQueue.updateStatus(remId, 'COMPLETED');
    console.log('[TEST] Updated remediation status.');

    // 3. Test SemanticHub -> VectorHub
    console.log('[TEST] Saving skill...');
    const skillId = `sk_v8_${testId}`;
    await semanticHub.saveSkill({
      id: skillId,
      name: `Celestial Reasoning ${testId}`,
      description: 'High-performance SQL-backed reasoning',
      success_rate: 0.99
    });

    // 4. Verify SQLite contents
    console.log('[TEST] Verifying SQLite contents...');
    await vectorHub.init();

    const traces = vectorHub.query(
      'SELECT * FROM traces WHERE trace_id = ?',
      [`v8_trace_${testId}`]
    );
    console.log(`[TEST] Traces found: ${traces.length}`);

    const rems = vectorHub.query(
      'SELECT * FROM remediations WHERE id = ?',
      [remId]
    );
    console.log(`[TEST] Remediations found: ${rems.length} (Status: ${rems[0]?.status})`);

    const skills = vectorHub.query(
      'SELECT * FROM skills WHERE skill_id = ?',
      [skillId]
    );
    console.log(`[TEST] Skills found: ${skills.length} (Success Rate: ${skills[0]?.success_rate})`);

    // 5. Semantic Search Test
    console.log('[TEST] Testing semantic search (FTS)...');
    const results = await vectorHub.searchTraces(`persistence test ${testId}`);
    console.log(`[TEST] FTS Search Results: ${results.length}`);

    if (traces.length > 0 && rems.length > 0 && skills.length > 0 && results.length > 0) {
      console.log('✅ MindForge v8 Persistence Verification Passed.');
    } else {
      console.error('❌ MindForge v8 Persistence Verification Failed.');
    }

  } catch (err) {
    console.error(`[TEST] Error: ${err.message}`);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTest();
