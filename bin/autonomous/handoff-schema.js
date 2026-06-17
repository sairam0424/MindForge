'use strict';

/**
 * MindForge — Typed inter-agent message protocol.
 *
 * Ports ECC's ecc2/src/comms/mod.rs MessageType + TaskPriority as a JSON-schema
 * validator. Complements state-manager.js validateHandoff (which validates the
 * HANDOFF.json envelope) by typing the individual messages agents exchange:
 *
 *   kinds:    task_handoff | query | response | completed | conflict
 *   priority: low | normal | high | critical  (default normal; legacy fallback)
 *
 * The Conflict kind pairs with the worktree engine's merge-readiness output
 * (bin/worktree/engine.js). This is discipline/typing, not new runtime behavior.
 */

const MESSAGE_KINDS = ['task_handoff', 'query', 'response', 'completed', 'conflict'];
const PRIORITIES = ['low', 'normal', 'high', 'critical'];
const DEFAULT_PRIORITY = 'normal';

// Required fields per kind (mirrors ECC's MessageType variants).
const REQUIRED_FIELDS = {
  task_handoff: ['task', 'context'],
  query: ['question'],
  response: ['answer'],
  completed: ['summary'],          // files_changed optional, defaults []
  conflict: ['file', 'description'],
};

/**
 * Validate a typed message object. Returns { valid, warnings }.
 * Fail-open style (matches validateHandoff): collects warnings, never throws.
 */
function validateMessage(msg) {
  const warnings = [];
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
    return { valid: false, warnings: ['message is not an object'] };
  }
  if (!MESSAGE_KINDS.includes(msg.kind)) {
    warnings.push(`invalid kind: "${msg.kind}". Expected one of: ${MESSAGE_KINDS.join(', ')}`);
    return { valid: false, warnings };
  }
  for (const field of REQUIRED_FIELDS[msg.kind]) {
    if (typeof msg[field] !== 'string' || msg[field].length === 0) {
      warnings.push(`${msg.kind} missing required string field: ${field}`);
    }
  }
  if (msg.kind === 'completed' && msg.files_changed !== undefined && !Array.isArray(msg.files_changed)) {
    warnings.push('completed.files_changed must be an array');
  }
  if (msg.kind === 'task_handoff' && msg.priority !== undefined && !PRIORITIES.includes(msg.priority)) {
    warnings.push(`invalid priority: "${msg.priority}". Expected one of: ${PRIORITIES.join(', ')}`);
  }
  return { valid: warnings.length === 0, warnings };
}

/**
 * Resolve a handoff message's priority, defaulting to "normal" and tolerating
 * legacy entries that lack a typed priority (ECC's legacy fallback).
 */
function handoffPriority(msg) {
  if (!msg || typeof msg !== 'object') return DEFAULT_PRIORITY;
  const p = msg.priority;
  return PRIORITIES.includes(p) ? p : DEFAULT_PRIORITY;
}

/**
 * One-line human preview of a typed message (for status/log surfaces).
 */
function preview(msg) {
  const trunc = (s, n) => {
    const t = String(s || '').trim();
    return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
  };
  switch (msg && msg.kind) {
    case 'task_handoff': {
      const p = handoffPriority(msg);
      return p === DEFAULT_PRIORITY
        ? `handoff ${trunc(msg.task, 56)}`
        : `handoff [${p}] ${trunc(msg.task, 48)}`;
    }
    case 'query': return `query ${trunc(msg.question, 56)}`;
    case 'response': return `response ${trunc(msg.answer, 56)}`;
    case 'completed': {
      const n = Array.isArray(msg.files_changed) ? msg.files_changed.length : 0;
      return n === 0 ? `completed ${trunc(msg.summary, 48)}` : `completed ${trunc(msg.summary, 40)} | ${n} files`;
    }
    case 'conflict': return `conflict ${msg.file} | ${trunc(msg.description, 40)}`;
    default: return `unknown ${trunc(JSON.stringify(msg), 56)}`;
  }
}

/**
 * Build a well-formed message of a given kind (convenience + normalization).
 * Throws if the result fails validation, so callers can't emit a bad message.
 */
function makeMessage(kind, fields = {}) {
  const msg = Object.assign({ kind }, fields);
  if (kind === 'task_handoff' && msg.priority === undefined) msg.priority = DEFAULT_PRIORITY;
  if (kind === 'completed' && msg.files_changed === undefined) msg.files_changed = [];
  const { valid, warnings } = validateMessage(msg);
  if (!valid) throw new Error(`invalid ${kind} message: ${warnings.join('; ')}`);
  return msg;
}

module.exports = {
  MESSAGE_KINDS,
  PRIORITIES,
  DEFAULT_PRIORITY,
  validateMessage,
  handoffPriority,
  preview,
  makeMessage,
};
