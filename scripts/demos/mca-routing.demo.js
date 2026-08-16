/**
 * MindForge — Pillar V: Multi-Cloud Arbitrage Test
 * Verifies Affinity Routing based on historical task performance.
 */
'use strict';

const CloudBroker = require('../bin/models/cloud-broker');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('--- STARTING MCA AFFINITY ROUTING TEST ---');

  const broker = new CloudBroker();
  
  // Test Case 1: Refactor Task
  // Based on seed data: Anthropic (45/2) vs Google (25/8)
  console.log('\n[TEST] Routing a "refactor" task...');
  const provider1 = broker.getBestProvider({ taskType: 'refactor' });
  console.log(`Result: ${provider1} (Expected: anthropic)`);

  // Test Case 2: Test Task
  // Based on seed data: Google (50/2) vs Anthropic (30/1)
  // Google has more volume and high success, should be preferred for testing
  console.log('\n[TEST] Routing a "test" task...');
  const provider2 = broker.getBestProvider({ taskType: 'test' });
  console.log(`Result: ${provider2} (Expected: google)`);

  // Test Case 3: Unknown Task
  console.log('\n[TEST] Routing an "unknown" task...');
  const provider3 = broker.getBestProvider({ taskType: 'unknown' });
  console.log(`Result: ${provider3} (Should fallback to latency/cost weight)`);

  console.log('\n--- MCA TEST COMPLETE ---');
}

runTest().catch(console.error);
