/**
 * MindForge v8 — Orbital Governance Verification Test (Pillar XVIII)
 * Tests hardware-attested security gates for high-impact mutations.
 */
const policyGate = require('../bin/governance/policy-gate-hardened');
const orbitalGuardian = require('../bin/engine/orbital-guardian');
const ztaiManager = require('../bin/governance/ztai-manager');
const vectorHub = require('../bin/memory/vector-hub');

async function runTest() {
  console.log('[TEST] Starting v8 Orbital Governance Verification...');

  try {
    await vectorHub.init();
    
    // 1. Register a Tier 3 "Orbital" Agent
    console.log('[TEST] Registering Tier 3 Governor Agent...');
    const governorDid = await ztaiManager.registerAgent('mf-governor', 3);
    console.log(`[TEST] Governor DID: ${governorDid}`);

    // 2. Simulate High-Impact Request (Impact 98)
    const request = {
        requestId: `req_destructive_${Math.random().toString(36).substr(2, 5)}`,
        action: 'DELETE_PRODUCTION_INDEX',
        impact: 98
    };

    console.log(`[TEST] Evaluating High-Impact Request: ${request.action} (Impact: ${request.impact})`);
    let decision = await policyGate.evaluateBypass(request, request.impact);

    // Should be blocked
    if (decision.status === 'WAIT_FOR_ORBITAL') {
        console.log('✅ Gate successfully BLOCKED high-impact action and requested Orbital Attestation.');
    } else {
        throw new Error(`Expected WAIT_FOR_ORBITAL, got ${decision.status}`);
    }

    // 3. Perform Orbital Attestation (Hardware Signing Handshake)
    console.log('[TEST] Performing Hardware-Attested Bypass...');
    await policyGate.recordBypass(request.requestId, governorDid, 'BIOMETRIC_TOUCH_ID_v8_SIGNED');

    // 4. Re-evaluate Request
    console.log('[TEST] Re-evaluating Request after Attestation...');
    decision = await policyGate.evaluateBypass(request, request.impact);

    if (decision.status === 'ALLOWED' && decision.attestation_id) {
        console.log(`✅ Gate successfully ALLOWED action with Attestation ID: ${decision.attestation_id}`);
    } else {
        throw new Error(`Expected ALLOWED, got ${decision.status}`);
    }

    // 5. Verify SQL Persistence
    console.log('[TEST] Verifying SQLite persistence of the attestation record...');
    const records = await vectorHub.db.selectFrom('attestations')
        .selectAll()
        .where('request_id', '=', request.requestId)
        .execute();

    if (records.length === 1 && records[0].status === 'APPROVED') {
        process.stdout.write('✅ SQLite Attestation Audit Trail Verified.\n');
        console.log('✅ MindForge v8 Orbital Governance Passed.');
    } else {
        throw new Error('Attestation record not found or invalid in SQLite!');
    }

  } catch (err) {
    console.error(`[TEST] ❌ Error: ${err.message}`);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTest();
