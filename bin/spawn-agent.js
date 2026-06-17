#!/usr/bin/env node
/**
 * MindForge Agent Spawner — v2.0.0
 * Specialized logic for invoking personas and identities.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const MODE = ARGS[0]; // 'spawn', 'identity', or 'subagent'
const TARGET = ARGS[1];
const IS_DRY_RUN = ARGS.includes('--dry-run');

const ROOT = path.resolve(__dirname, '..');
const SUBAGENTS_DIR = path.join(ROOT, 'subagents');
const INDEX_PATH = path.join(ROOT, '.mindforge', 'imported-agents.jsonl');

// Names are restricted to a strict allowlist: no path separators, no '..', and
// only [A-Za-z0-9-_]. This is the first line of defense against path traversal
// in the `subagent` mode — names that fail this never touch the filesystem.
const SAFE_NAME_PATTERN = /^[A-Za-z0-9-_]+$/;

if (!MODE || !TARGET) {
  console.error('❌ Usage: node bin/spawn-agent.js <mode> <target> [--dry-run]');
  console.error('   modes: identity | spawn | subagent');
  process.exit(1);
}

/**
 * Validate a user-supplied subagent name against the strict allowlist. Rejects
 * path separators, parent-dir tokens, and any character outside [A-Za-z0-9-_].
 * Exits the process on violation rather than returning, so no unsafe name can
 * proceed to a filesystem lookup.
 */
function assertSafeName(name) {
  if (!SAFE_NAME_PATTERN.test(name)) {
    console.error(`❌ Invalid subagent name: "${name}" (allowed: A-Z a-z 0-9 - _)`);
    process.exit(1);
  }
}

/**
 * Resolve a subagent name to its index entry by EXACT name match. Never builds
 * a path from user input — only paths recorded in the trusted index are used.
 * Returns the matching entry or null if no entry matches.
 */
function findIndexEntry(name) {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`❌ Subagent index not found: ${INDEX_PATH}`);
    console.error('   Run: node scripts/build-subagent-index.js');
    process.exit(1);
  }

  const lines = fs.readFileSync(INDEX_PATH, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const entry = JSON.parse(line);
    if (entry.name === name) {
      return entry;
    }
  }
  return null;
}

/**
 * Resolve and verify the absolute path for an index entry. Confirms the
 * resolved path stays within the repo's subagents/ directory before returning
 * it (defense in depth against a tampered index). Exits on any violation.
 */
function resolveSubagentPath(entry) {
  const absolutePath = path.resolve(ROOT, entry.path);
  const containmentRoot = SUBAGENTS_DIR + path.sep;

  if (!absolutePath.startsWith(containmentRoot)) {
    console.error(`❌ Resolved path escapes subagents/: ${absolutePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Subagent file missing: ${absolutePath}`);
    process.exit(1);
  }
  return absolutePath;
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
  } else if (MODE === 'subagent') {
    assertSafeName(TARGET);
    const entry = findIndexEntry(TARGET);
    if (!entry) {
      console.error(`❌ Subagent not found in index: ${TARGET}`);
      process.exit(1);
    }
    const subagentPath = resolveSubagentPath(entry);
    fs.readFileSync(subagentPath, 'utf8'); // verify readability before dispatch
    console.log(`🧬 Loading imported subagent: ${TARGET} [${entry.category}/${entry.model}]`);
  } else {
    console.error(`❌ Unknown mode: ${MODE} (expected identity | spawn | subagent)`);
    process.exit(1);
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
