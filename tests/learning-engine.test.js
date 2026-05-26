/**
 * MindForge Learning Engine Test Suite
 * Part of the Sovereign Intelligence v6.2.0-alpha validation.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const LearningManager = require('../bin/engine/learning-manager');

async function runTests() {
  console.log('🧪 Starting Learning Engine Tests...');
  
  const testDir = path.join(__dirname, 'tmp-learning-test');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const manager = new LearningManager({
    rootDir: testDir,
    templateDir: path.join(__dirname, '../docs/templates/Project')
  });

  try {
    // 1. Test Initialization
    console.log('  Testing init()...');
    const learningFile = await manager.init({
      name: 'Test Project',
      techStack: 'Node.js, Mocha',
      systemDid: '0xunittest'
    });

    if (!fs.existsSync(learningFile)) throw new Error('Initialization failed: file not created');
    const content = fs.readFileSync(learningFile, 'utf8');
    if (!content.includes('Test Project')) throw new Error('Initialization failed: content not hydrated');
    console.log('  ✅ init() passed');

    // 2. Test Recording
    console.log('  Testing record()...');
    await manager.record({
      context: 'Unit Test Wave',
      mistake: 'Failing to clean up tmp-test-dir',
      rootCause: 'Manual intervention omitted RM command',
      fix: 'Implemented fs.rmSync in teardown',
      category: 'Bug Fix',
      did: 'did:mindforge:enclave:0xunittest'
    });

    const updatedContent = fs.readFileSync(learningFile, 'utf8');
    if (!updatedContent.includes('Unit Test Wave')) throw new Error('Recording failed: entry not found');
    if (!updatedContent.includes('did:mindforge:enclave:0xunittest')) throw new Error('Recording failed: DID not found');
    console.log('  ✅ record() passed');

    // 3. Test Status
    console.log('  Testing getStatus()...');
    const status = await manager.getStatus();
    if (status.entryCount !== 1) throw new Error(`Status failed: expected 1 entry, got ${status.entryCount}`);
    console.log('  ✅ getStatus() passed');

    console.log('\n🎉 All Learning Engine tests passed!');
  } catch (err) {
    console.error(`\n❌ Test failed: ${err.message}`);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  }
}

runTests();
