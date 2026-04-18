const assert = require('node:assert');
const PolicyEngine = require('../bin/governance/policy-engine');

try {
  const engine = new PolicyEngine();
  const status = engine.getSovereignStatus();

  console.log('Testing Sovereign Status Output...');
  if (status.pqas.active !== true) throw new Error('PQAS should be active');
  if (status.proactive_homing.status !== 'MANIFESTED') throw new Error('Homing should be MANIFESTED');
  if (status.policy_engine.version !== '8.2.0') throw new Error('Version should match');

  console.log('✅ Sovereign Status Verification PASSED');
} catch (err) {
  console.error('❌ Sovereign Status Verification FAILED');
  console.error(err);
  process.exit(1);
}