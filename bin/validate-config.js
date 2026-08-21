#!/usr/bin/env node
/**
 * MindForge configuration validator
 * Validates MINDFORGE.md against the JSON schema
 * Usage: node bin/validate-config.js [path-to-MINDFORGE.md]
 */

'use strict';

const fs = require('fs');
const path = require('path');

// The one bracket-aware MINDFORGE.md reader (see bin/utils/mindforge-params.js).
const { readParams } = require('./utils/mindforge-params');

// The config belongs to the CALLER, so it stays relative to cwd.
const CONFIG_PATH  = process.argv[2] || 'MINDFORGE.md';

/**
 * The schema belongs to the FRAMEWORK, so it is resolved from __dirname first.
 *
 * This was the bare relative `'.mindforge/MINDFORGE-SCHEMA.json'`, which only ever resolved
 * because bin/mindforge-cli.js pinned the child's cwd to MindForge's own install directory. That
 * pin is what made `security-scan` validate the vendor's MINDFORGE.md and report
 * `✅ valid — 43 settings configured` over any caller's config. Removing the pin without anchoring
 * the schema here would have swapped one broken outcome for another: every consumer with a real
 * MINDFORGE.md would hit the `not found` branch below and exit 0 having validated NOTHING. Measured
 * that exact regression on a fixture — `ℹ️ MINDFORGE-SCHEMA.json not found — skipping schema
 * validation`, rc=0 — which is why the two changes ship together.
 *
 * Every check in this file is schema-driven (required, recommended, type, minimum, maximum, enum,
 * pattern, nonOverridable). There is no schema-free validation path, so a missing schema is not a
 * degraded check, it is no check.
 *
 * Package-relative first, cwd-relative second, because the two supported install shapes put the
 * schema in different places:
 *   - `npx mindforge-cc` — runs from node_modules/mindforge-cc/, where .mindforge/ ships. Fixed.
 *   - a copied bin/ tree — the installer copies bin/ but creates no .mindforge/, verified on a
 *     clean `--claude --local` install. There the schema is genuinely absent and the honest skip
 *     below is the correct outcome; the cwd fallback still finds one if the project has its own.
 */
function resolveSchemaPath() {
  const candidates = [
    path.join(__dirname, '..', '.mindforge', 'MINDFORGE-SCHEMA.json'),
    path.join(process.cwd(), '.mindforge', 'MINDFORGE-SCHEMA.json'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

const SCHEMA_PATH = resolveSchemaPath();

if (!fs.existsSync(CONFIG_PATH)) {
  // Name the path actually looked for, and where. This said "MINDFORGE.md not found" verbatim even
  // when argv[2] supplied a different file, so `validate-config.js custom-config.md` reported a
  // missing MINDFORGE.md — a message about a file the caller never mentioned. It cost real time
  // during this change: a test failure was diagnosed as "a defaultArgs positional shadowed argv[2]"
  // when the truth was simply that the named file was not in the working directory.
  console.log(`ℹ️  ${CONFIG_PATH} not found in ${process.cwd()} — using all defaults. `
    + 'Create one to customise.');
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
