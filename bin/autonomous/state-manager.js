/**
 * MindForge — State Manager
 * Extracted from auto-runner.js — handles state transitions, HANDOFF.json and
 * auto-state.json read/write, and phase management.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { atomicWriteJSON } = require('../utils/file-io');

const VALID_PHASES = ['idle', 'planning', 'executing', 'verifying', 'complete', 'running', 'paused', 'completed'];
const VALID_STATUSES = ['idle', 'running', 'paused', 'completed', 'escalated', 'timeout'];

/**
 * Validates HANDOFF.json structure without blocking on failure (fail-open).
 * Warns on malformed fields but always returns the data for processing.
 * @param {*} data — Parsed HANDOFF.json content
 * @returns {{ valid: boolean, warnings: string[] }}
 */
function validateHandoff(data) {
  const warnings = [];

  if (!data || typeof data !== 'object') {
    warnings.push('HANDOFF.json is not a valid object');
    return { valid: false, warnings };
  }

  if (!data.schema_version) {
    warnings.push('Missing schema_version field');
  }

  if (data.handoffs && !Array.isArray(data.handoffs)) {
    warnings.push('handoffs field must be an array');
  }

  if (data.handoffs && Array.isArray(data.handoffs)) {
    for (let i = 0; i < data.handoffs.length; i++) {
      const task = data.handoffs[i];
      if (!task.id) warnings.push(`handoffs[${i}] missing required field: id`);
      if (!task.name) warnings.push(`handoffs[${i}] missing required field: name`);
    }
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    warnings.push(`Invalid status: "${data.status}". Expected one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (data.wave_current !== undefined && typeof data.wave_current !== 'number') {
    warnings.push('wave_current must be a number');
  }

  if (data.tasks_completed !== undefined && typeof data.tasks_completed !== 'number') {
    warnings.push('tasks_completed must be a number');
  }

  if (data.timestamps && typeof data.timestamps !== 'object') {
    warnings.push('timestamps must be an object');
  }

  return { valid: warnings.length === 0, warnings };
}

/**
 * Creates a state manager for the given planning directory.
 * @param {string} planningDir — Absolute path to the .planning directory
 * @returns {{ getState, updateState, transition, readHandoff, writeHandoff }}
 */
function createStateManager(planningDir) {
  const statePath = path.join(planningDir, 'auto-state.json');
  const handoffPath = path.join(planningDir, 'HANDOFF.json');

  /**
   * Reads the current state from auto-state.json.
   * Returns a fresh object (never a shared reference).
   */
  function getState() {
    if (!fs.existsSync(statePath)) {
      return Object.create(null);
    }

    try {
      const raw = fs.readFileSync(statePath, 'utf8');
      const parsed = JSON.parse(raw);
      return sanitizeState(parsed);
    } catch (e) {
      // Corrupt state file — return empty
      return Object.create(null);
    }
  }

  /**
   * Merges a patch into the current state (immutable — writes new object to disk).
   * @param {object} patch — Key/value pairs to merge
   */
  function updateState(patch) {
    const current = getState();
    const merged = Object.assign(Object.create(null), current, patch);
    atomicWriteJSON(statePath, merged);
    return merged;
  }

  /**
   * Transitions the state to a new status phase.
   * @param {string} newPhase — One of: idle, planning, executing, verifying, complete, running, paused, completed
   */
  function transition(newPhase) {
    if (!VALID_PHASES.includes(newPhase)) {
      throw new Error(`Invalid state transition target: "${newPhase}". Valid: ${VALID_PHASES.join(', ')}`);
    }
    return updateState({
      status: newPhase,
      lastTransition: new Date().toISOString(),
    });
  }

  /**
   * Reads and parses HANDOFF.json with schema validation (fail-open).
   * Logs warnings for structural issues but always returns data if parseable.
   * @returns {object} Parsed handoff data (fresh object)
   */
  function readHandoff() {
    if (!fs.existsSync(handoffPath)) {
      throw new Error('HANDOFF.json not found — run /mindforge:plan-phase first');
    }

    let handoff;
    try {
      handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
    } catch (e) {
      throw new Error(`HANDOFF.json is malformed: ${e.message}`);
    }

    // Fail-open schema validation — warn but never block
    const { valid, warnings } = validateHandoff(handoff);
    if (!valid) {
      for (const warning of warnings) {
        console.warn('[STATE] HANDOFF validation:', warning);
      }
    }

    return handoff;
  }

  /**
   * Writes data to HANDOFF.json (immutable — creates new file contents).
   * @param {object} data — The handoff object to persist
   */
  function writeHandoff(data) {
    const timestamped = Object.assign(Object.create(null), data, {
      last_updated: new Date().toISOString(),
    });
    atomicWriteJSON(handoffPath, timestamped);
    return timestamped;
  }

  return Object.freeze({ getState, updateState, transition, readHandoff, writeHandoff });
}

/**
 * Sanitizes parsed JSON to prevent prototype pollution.
 */
function sanitizeState(parsed) {
  const clean = Object.create(null);
  for (const key of Object.keys(parsed)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = parsed[key];
  }
  return clean;
}

module.exports = { createStateManager, validateHandoff };
