/**
 * MindForge — State Manager
 * Extracted from auto-runner.js — handles state transitions, HANDOFF.json and
 * auto-state.json read/write, and phase management.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const VALID_PHASES = ['idle', 'planning', 'executing', 'verifying', 'complete', 'running', 'paused', 'completed'];

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
    fs.writeFileSync(statePath, JSON.stringify(merged, null, 2));
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
   * Reads and parses HANDOFF.json. Throws if missing or malformed.
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

    if (!handoff.handoffs || !Array.isArray(handoff.handoffs)) {
      throw new Error('HANDOFF.json has no handoffs array');
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
    fs.writeFileSync(handoffPath, JSON.stringify(timestamped, null, 2) + '\n');
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

module.exports = { createStateManager };
