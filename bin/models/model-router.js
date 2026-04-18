/**
 * MindForge v2 — Model Router
 * Resolves persona and tier to a specific model ID based on settings and context.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Default model assignments
const DEFAULTS = {
  PLANNER_MODEL:          'claude-4-5-opus-preview',
  EXECUTOR_MODEL:         'claude-3-5-sonnet-20240620',
  REVIEWER_MODEL:         'gpt-4o',
  SECURITY_MODEL:         'claude-3-opus-20240229',
  RESEARCH_MODEL:         'gemini-1.5-pro',
  QA_MODEL:               'claude-3-5-sonnet-20240620',
  DEBUG_MODEL:            'claude-3-opus-20240229',
  QUICK_MODEL:            'claude-3-5-haiku-20241022',
  CROSS_REVIEW_SECONDARY: 'gpt-4o',
  CROSS_REVIEW_TERTIARY:  'gemini-1.5-pro',
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

function readMindforgeSettings() {
  if (_settingsCache) return _settingsCache;
  const configPath = path.join(process.cwd(), 'MINDFORGE.md');
  if (!fs.existsSync(configPath)) return DEFAULTS;

  const content = fs.readFileSync(configPath, 'utf8');
  const settings = { ...DEFAULTS };
  
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      settings[match[1]] = match[2].trim();
    }
  }
  _settingsCache = settings;
  return settings;
}

function route(persona = 'developer', tier = 1) {
  const settings = readMindforgeSettings();
  
  // 1. Tier 3 override (Security/Privacy always uses SECURITY_MODEL)
  if (tier === 3) {
    return {
      model: settings.SECURITY_MODEL,
      setting: 'SECURITY_MODEL',
      reason: 'Tier 3 (Security/Privacy) override'
    };
  }

  // 2. Persona mapping (Specific personas like research, debug, qa)
  if (persona !== 'developer' && PERSONA_MAP[persona]) {
    const settingKey = PERSONA_MAP[persona];
    return {
      model: settings[settingKey],
      setting: settingKey,
      reason: `Mapped from specific persona "${persona}"`
    };
  }

  // 3. Budget Bias (Tier 1 uses QUICK_MODEL for default developer tasks)
  if (tier === 1) {
    return {
      model: settings.QUICK_MODEL,
      setting: 'QUICK_MODEL',
      reason: 'Tier 1 Budget Bias (efficiency mode)'
    };
  }

  // 4. Default mapping
  const settingKey = 'EXECUTOR_MODEL';
  const model = settings[settingKey];

  return {
    model,
    setting: settingKey,
    reason: `Default EXECUTOR_MODEL for tier ${tier}`
  };
}

function getModel(settingKey) {
  const settings = readMindforgeSettings();
  return settings[settingKey] || DEFAULTS[settingKey];
}

function clearCache() {
  _settingsCache = null;
}

function getAllSettings() {
  return readMindforgeSettings();
}

module.exports = { route, getModel, clearCache, getAllSettings };
