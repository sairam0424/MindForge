#!/usr/bin/env node
'use strict';
/**
 * MindForge — Instinct Auto-Capture Hook (UC-11)
 * Invoked as a PostToolUse hook. Reads hook event JSON from stdin,
 * detects successful task completions, and appends lightweight instinct
 * entries to the configured store path.
 *
 * Session capture limit is enforced via a temp counter file to avoid
 * flooding the store with low-signal entries.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { detectProject } = require('./lib/detect-project');
const { redactSecrets } = require('../utils/redact-secrets');

// ── Configuration ────────────────────────────────────────────────────────────

const CONFIG_PATH = path.join(process.cwd(), '.mindforge', 'config.json');
const SESSION_ID = process.env.MINDFORGE_SESSION_ID || process.ppid || 'default';
const SESSION_COUNTER_PATH = path.join(
  os.tmpdir(),
  `mindforge-instinct-session-${SESSION_ID}.count`
);

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getSessionCount() {
  try {
    const raw = fs.readFileSync(SESSION_COUNTER_PATH, 'utf8');
    return parseInt(raw, 10) || 0;
  } catch {
    return 0;
  }
}

function incrementSessionCount() {
  const current = getSessionCount();
  fs.writeFileSync(SESSION_COUNTER_PATH, String(current + 1));
}

// ── Success Detection ────────────────────────────────────────────────────────

function isSuccessfulCompletion(payload) {
  const tool = (payload.tool_name || payload.tool || '').toLowerCase();

  // Bash tool with exit code 0
  if (tool === 'bash') {
    const exitCode = payload.exit_code ?? payload.result?.exit_code ?? null;
    if (exitCode === 0) return true;
    // If no explicit exit code but has output and no error marker
    if (exitCode === null && payload.output && !payload.error) return true;
    return false;
  }

  // Task tool with completed status
  if (tool === 'task') {
    const status = (payload.status || payload.result?.status || '').toLowerCase();
    return status === 'completed' || status === 'done';
  }

  return false;
}

// ── Pattern Extraction ───────────────────────────────────────────────────────

function extractPattern(payload) {
  const tool = (payload.tool_name || payload.tool || '').toLowerCase();

  if (tool === 'bash') {
    const command = payload.command || payload.input?.command || payload.tool_input?.command || '';
    if (!command || command.length < 5) return null;
    // Skip trivial commands
    if (/^(ls|pwd|echo|cat|cd)\b/.test(command.trim())) return null;
    // Redact BEFORE truncating. Slicing first can cut a credential mid-token, leaving a fragment
    // that no longer matches its own prefix rule — a half-secret is still a secret.
    const safe = redactSecrets(command).slice(0, 200);
    return {
      observation: `Bash command succeeded: ${safe}`,
      behavior: `Use pattern: ${safe}`,
    };
  }

  if (tool === 'task') {
    const description = payload.description || payload.task_description || payload.name || '';
    if (!description) return null;
    // The Task branch leaks too, and it is easy to miss because it carries no "command" in its name.
    // Measured: a payload {tool_name:'Task', status:'completed', description:'rotate prod secret
    // using token <40 chars>'} wrote that token verbatim into BOTH fields.
    const safe = redactSecrets(description).slice(0, 200);
    return {
      observation: `Task completed successfully: ${safe}`,
      behavior: `Reuse approach for similar tasks: ${safe}`,
    };
  }

  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const config = loadConfig();
  if (!config || !config.instincts) {
    process.exit(0);
  }

  const { mode, max_capture_per_session, store_path } = config.instincts;
  if (mode !== 'auto-capture') {
    process.exit(0);
  }

  // Check session limit
  const sessionCount = getSessionCount();
  if (sessionCount >= (max_capture_per_session || 5)) {
    process.exit(0);
  }

  // Read stdin (hook payload)
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch {
    process.exit(0);
  }

  if (!input.trim()) {
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  // Check if this is a successful completion
  if (!isSuccessfulCompletion(payload)) {
    process.exit(0);
  }

  // Extract pattern
  const pattern = extractPattern(payload);
  if (!pattern) {
    process.exit(0);
  }

  // Detect the current project so instincts are scoped per-repo (no cross-project
  // leak). Falls back to 'global' outside a git repo. project_id is the portable
  // git-remote hash; project is the human-readable name.
  let projectId = 'global';
  let projectName = 'global';
  try {
    const detected = detectProject(process.cwd());
    projectId = detected.id;
    projectName = detected.name;
  } catch {
    // Non-fatal — keep defaults; hooks must never block.
  }

  // Build instinct entry
  const entry = {
    id: `inst-${crypto.randomUUID()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    observation: pattern.observation,
    behavior: pattern.behavior,
    confidence: 0.3,
    times_applied: 0,
    times_succeeded: 0,
    times_failed: 0,
    project: projectName,
    project_id: projectId,
    tags: [],
    status: 'active',
    promoted_to_skill: null,
    last_applied_at: null,
    source: 'auto-capture',
  };

  // Write to store
  const storePath = path.resolve(process.cwd(), store_path);
  const storeDir = path.dirname(storePath);

  try {
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
    }
    // LOCK-01: instinct-cli's prune/import does read-modify-atomic-rename under this
    // same lock, so an unlocked append here can be clobbered by that rename. Low
    // maxTries because this is a hook fast path — the catch below keeps it non-fatal.
    const { withFileLock } = require('../utils/file-lock');
    withFileLock(storePath, () => {
      fs.appendFileSync(storePath, JSON.stringify(entry) + '\n');
    }, { maxTries: 10, label: 'instinct-store' });
    incrementSessionCount();
  } catch {
    // Non-fatal — hooks must not block
  }

  process.exit(0);
}

main();
