/**
 * MindForge v7 — Security & Observability Test
 * Verifies pluggable crypto and new tracer hooks.
 */
'use strict';

const quantumCrypto = require('./quantum-crypto');
const nexusTracer = require('../engine/nexus-tracer');

async function testSecurityAndTracer() {
  console.log('--- Security & Tracer Test ---');

  // 1. Verify Crypto Provider
  const provider = quantumCrypto.getProvider();
  console.log(`Active Crypto Provider: ${provider.id} (${provider.algorithm})`);
  
  if (provider.id !== 'simulated-lattice') {
    throw new Error(`Expected simulated-lattice provider, got ${provider.id}`);
  }

  // 2. Verify PQAS Key Generation
  const keys = await quantumCrypto.generateLatticeKeyPair();
  console.log(`Generated Keys with Provider: ${keys.provider}`);
  if (keys.provider !== provider.id) throw new Error('Key provider mismatch');

  // 3. Verify Tracer Fine-Tuning Hook
  const spanId = await nexusTracer.startSpan('critical-logic-test');
  const criticalThought = 'This thought is so critically broken and repeating that it should trigger the v7 fine-tuning hook. Repeating, repeating, repeating, repeating, repeating.';
  
  console.log('[Tracer] Recording critical reasoning trace...');
  await nexusTracer.recordReasoning(spanId, 'test-agent', criticalThought);
  
  // 4. Verify SBOM Arbitrage
  nexusTracer.recordArbitrage(0.005);
  const sbomPath = await nexusTracer.exportSBOM();
  console.log(`SBOM Exported to: ${sbomPath}`);
  
  const sbomRaw = require('fs').readFileSync(sbomPath, 'utf8');
  const sbom = JSON.parse(sbomRaw);
  console.log(`SBOM Arbitrage Total: ${sbom.arbitrage_total}`);
  
  if (sbom.arbitrage_total !== 0.005) throw new Error('SBOM Arbitrage tracking failed');

  console.log('PASSED');
}

testSecurityAndTracer().catch(err => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
