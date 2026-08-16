#!/usr/bin/env node
/**
 * MindForge configuration validator
 * Validates MINDFORGE.md against the JSON schema
 * Usage: node bin/validate-config.js [path-to-MINDFORGE.md]
 */

'use strict';

const fs = require('fs');

// The one bracket-aware MINDFORGE.md reader (see bin/utils/mindforge-params.js).
const { readParams } = require('./utils/mindforge-params');

const CONFIG_PATH  = process.argv[2] || 'MINDFORGE.md';
const SCHEMA_PATH  = '.mindforge/MINDFORGE-SCHEMA.json';

if (!fs.existsSync(CONFIG_PATH)) {
  console.log('ℹ️  MINDFORGE.md not found — using all defaults. Create one to customise.');
  process.exit(0);
}

if (!fs.existsSync(SCHEMA_PATH)) {
  console.log('ℹ️  MINDFORGE-SCHEMA.json not found — skipping schema validation.');
  process.exit(0);
}

const schema  = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

const errors   = [];
const warnings = [];

// MINDFORGE.md declares parameters as bracketed assignments ([KEY] = value).
// v11.9.2 and earlier matched /^([A-Z_]+)=(.+)$/, which matches ZERO lines of a
// real MINDFORGE.md — the validator parsed 0 settings and could never fail.
// readParams() also still handles the legacy plain KEY=value form.
const settings = readParams(CONFIG_PATH);

// Required / recommended key sets (top-level arrays in the schema). Kept
// deliberately identical to sdk/src/client.ts validateConfig() so the SDK and
// the CLI validator enforce ONE contract.
const required    = new Set(Array.isArray(schema.required) ? schema.required : []);
const recommended = new Set(Array.isArray(schema.recommended) ? schema.recommended : []);

for (const key of required) {
  if (!settings[key]) errors.push(`${key} is required but not set`);
}
for (const key of recommended) {
  if (!settings[key]) warnings.push(`${key} is recommended but not set`);
}

// Validate against schema
for (const [key, def] of Object.entries(schema.properties || {})) {
  const value = settings[key];

  // Legacy per-property `required` flag still honoured (schema.required wins).
  if (def.required && !value && !required.has(key)) {
    errors.push(`${key} is required but not set`);
    continue;
  }

  if (!value) continue;

  if (def.type === 'number') {
    const num = parseFloat(value);
    if (isNaN(num)) errors.push(`${key}: expected number, got "${value}"`);
    if (def.minimum !== undefined && num < def.minimum)
      errors.push(`${key}: ${num} is below minimum ${def.minimum}`);
    if (def.maximum !== undefined && num > def.maximum)
      errors.push(`${key}: ${num} exceeds maximum ${def.maximum}`);
  }

  if (def.type === 'enum' && !def.values.includes(value)) {
    errors.push(`${key}: "${value}" is not valid. Options: ${def.values.join(', ')}`);
  }

  if (def.type === 'boolean' && !['true','false'].includes(value)) {
    errors.push(`${key}: expected true or false, got "${value}"`);
  }

  if (def.type === 'string' && def.pattern && !new RegExp(def.pattern).test(value)) {
    errors.push(`${key}: "${value}" does not match required pattern ${def.pattern}`);
  }

  // A non-overridable governance primitive may be SET (MINDFORGE.md is its
  // source of truth) but never DISABLED. Mirrors sdk/src/client.ts:176-182,
  // which errors on `[KEY] = false`. The old code warned on every occurrence
  // and claimed the value "will be ignored" — which was untrue and pure noise.
  if (def.nonOverridable && def.type === 'boolean' && value === 'false') {
    errors.push(`${key}: non-overridable governance primitive cannot be disabled`);
  }
}

// Report
const total = errors.length + warnings.length;
if (total === 0) {
  console.log(`✅ MINDFORGE.md valid — ${Object.keys(settings).length} settings configured`);
  process.exit(0);
}

if (errors.length) {
  console.error(`❌ MINDFORGE.md has ${errors.length} error(s):`);
  errors.forEach(e => console.error(`   • ${e}`));
}
if (warnings.length) {
  console.warn(`⚠️  MINDFORGE.md has ${warnings.length} warning(s):`);
  warnings.forEach(w => console.warn(`   • ${w}`));
}

process.exit(errors.length ? 1 : 0);
