/**
 * MindForge v2 — Model Router
 * Resolves persona and tier to a specific model ID based on settings and context.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// The one bracket-aware MINDFORGE.md reader (see bin/utils/mindforge-params.js).
const { readParams } = require('../utils/mindforge-params');

// v9: Model topology aligned to Claude 4.x family (2026-04)
const DEFAULTS = {
  PLANNER_MODEL:          'claude-opus-4-7',
  EXECUTOR_MODEL:         'claude-sonnet-4-6',
  REVIEWER_MODEL:         'claude-sonnet-4-6',
  VERIFIER_MODEL:         'claude-sonnet-4-6',
  SECURITY_MODEL:         'claude-opus-4-7',
  RESEARCH_MODEL:         'gemini-2.5-pro',
  QA_MODEL:               'claude-sonnet-4-6',
  DEBUG_MODEL:            'claude-opus-4-7',
  QUICK_MODEL:            'claude-haiku-4-5',
  CROSS_REVIEW_SECONDARY: 'claude-sonnet-4-6',
  CROSS_REVIEW_TERTIARY:  'gemini-2.5-pro',
};

// Persona to setting key mapping
const PERSONA_MAP = {
  'developer':         'EXECUTOR_MODEL',
  'architect':         'PLANNER_MODEL',
  'planner':           'PLANNER_MODEL',
  'security-reviewer': 'SECURITY_MODEL',
  'qa-engineer':       'QA_MODEL',
  'research-agent':    'RESEARCH_MODEL',
  'debug-specialist':  'DEBUG_MODEL',
  'decision-architect': 'PLANNER_MODEL',
  'sre-engineer':     'EXECUTOR_MODEL',
  'sre-auditor':      'PLANNER_MODEL',
};

let _settingsCache = null;
let _settingsMtime = 0;
const CACHE_CHECK_INTERVAL_MS = 60000;
let _lastCacheCheck = 0;

// MINDFORGE.md declares the model topology with SHORT persona keys ([PLANNER]);
// the router's canonical setting keys are the *_MODEL names in DEFAULTS above,
// which is what every getAllSettings() consumer reads. Map short -> canonical
// and keep BOTH in the returned object so nothing reading *_MODEL breaks.
const KEY_ALIASES = {
  PLANNER:  'PLANNER_MODEL',
  EXECUTOR: 'EXECUTOR_MODEL',
  REVIEWER: 'REVIEWER_MODEL',
  VERIFIER: 'VERIFIER_MODEL',
  SECURITY: 'SECURITY_MODEL',
  RESEARCH: 'RESEARCH_MODEL',
  QA:       'QA_MODEL',
  DEBUG:    'DEBUG_MODEL',
  QUICK:    'QUICK_MODEL',
};

function parseSettings(filePath) {
  // v11.9.2 matched /^([A-Z0-9_]+)=(.*)$/ here, which matches ZERO lines of a
  // bracketed MINDFORGE.md — routing silently always used DEFAULTS.
  const raw = readParams(filePath);
  const settings = { ...DEFAULTS, ...raw };
  // An explicit [PLANNER_MODEL] always wins over the short [PLANNER] form.
  for (const [shortKey, canonicalKey] of Object.entries(KEY_ALIASES)) {
    if (raw[shortKey] !== undefined && raw[canonicalKey] === undefined) {
      settings[canonicalKey] = raw[shortKey];
    }
  }
  return settings;
}

function readMindforgeSettings() {
  const now = Date.now();
  if (now - _lastCacheCheck < CACHE_CHECK_INTERVAL_MS && _settingsCache) {
    return _settingsCache;
  }
  _lastCacheCheck = now;

  const configPath = path.join(process.cwd(), 'MINDFORGE.md');
  try {
    const stat = fs.statSync(configPath);
    if (stat.mtimeMs !== _settingsMtime) {
      _settingsMtime = stat.mtimeMs;
      _settingsCache = parseSettings(configPath);
    }
  } catch {
    if (!_settingsCache) _settingsCache = { ...DEFAULTS };
  }

  return _settingsCache;
}

function route(persona = 'developer', tier = 1, taskContext) {
  const settings = readMindforgeSettings();
  let result;

  // 1. Tier 3 override (Security/Privacy always uses SECURITY_MODEL)
  if (tier === 3) {
    result = {
      model: settings.SECURITY_MODEL,
      setting: 'SECURITY_MODEL',
      reason: 'Tier 3 (Security/Privacy) override'
    };
  }
  // 2. Persona mapping (Specific personas like research, debug, qa)
  else if (persona !== 'developer' && PERSONA_MAP[persona]) {
    const settingKey = PERSONA_MAP[persona];
    result = {
      model: settings[settingKey],
      setting: settingKey,
      reason: `Mapped from specific persona "${persona}"`
    };
  }
  // 3. Budget Bias (Tier 1 uses QUICK_MODEL for default developer tasks)
  else if (tier === 1) {
    result = {
      model: settings.QUICK_MODEL,
      setting: 'QUICK_MODEL',
      reason: 'Tier 1 Budget Bias (efficiency mode)'
    };
  }
  // 4. Default mapping
  else {
    const settingKey = 'EXECUTOR_MODEL';
    result = {
      model: settings[settingKey],
      setting: settingKey,
      reason: `Default EXECUTOR_MODEL for tier ${tier}`
    };
  }

  // Shadow-mode: difficulty-aware routing (UC-06)
  // Logs what model the difficulty scorer WOULD select, without changing the result.
  if (taskContext) {
    const { score: scoreDifficulty } = require('./difficulty-scorer');
    const difficulty = scoreDifficulty(taskContext);
    const shadowModel = difficulty <= 3 ? settings.QUICK_MODEL
                      : difficulty >= 8 ? settings.PLANNER_MODEL
                      : settings.EXECUTOR_MODEL;
    if (shadowModel !== result.model) {
      process.stderr.write(`[model-router:shadow] difficulty=${difficulty} would route to ${shadowModel} (actual: ${result.model})\n`);
    }
  }

  return result;
}

function getModel(settingKey) {
  const settings = readMindforgeSettings();
  return settings[settingKey] || DEFAULTS[settingKey];
}

function clearCache() {
  _settingsCache = null;
  _settingsMtime = 0;
  _lastCacheCheck = 0;
}

function getAllSettings() {
  return readMindforgeSettings();
}

module.exports = { route, getModel, clearCache, getAllSettings };
