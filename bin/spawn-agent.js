#!/usr/bin/env node
/**
 * MindForge Agent Spawner — v2.0.0
 * Specialized logic for invoking personas and identities.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const MODE = ARGS[0]; // 'spawn' or 'identity'
const TARGET = ARGS[1];
const IS_DRY_RUN = ARGS.includes('--dry-run');

const ROOT = path.resolve(__dirname, '..');

if (!MODE || !TARGET) {
  console.error('❌ Usage: node bin/spawn-agent.js <mode> <target> [--dry-run]');
  process.exit(1);
}

async function run() {
  let identityPath;
  let personaPath;

  if (MODE === 'identity') {
    identityPath = path.join(ROOT, 'agents', TARGET, 'IDENTITY.md');
    if (!fs.existsSync(identityPath)) {
      console.error(`❌ Identity not found: ${identityPath}`);
      process.exit(1);
    }
    console.log(`📡 Loading specialized identity: ${TARGET}`);
  } else if (MODE === 'spawn') {
    personaPath = path.join(ROOT, '.mindforge', 'personas', `${TARGET}.md`);
    if (!fs.existsSync(personaPath)) {
      console.error(`❌ Persona not found: ${personaPath}`);
      process.exit(1);
    }
    console.log(`🌌 Spawning persona essence: ${TARGET}`);
  }

  if (IS_DRY_RUN) {
    console.log('🧪 Dry run successful. Environment prepared.');
    process.exit(0);
  }

  // Future: Integration with Antigravity / Claude Code runtime
  console.log('🛠️ Dispatching to agent runtime...');
  // For now, we simulate the environment preparation
  setTimeout(() => {
    console.log('✅ Agent environment active.');
    process.exit(0);
  }, 500);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
