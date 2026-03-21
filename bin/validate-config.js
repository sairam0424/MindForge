#!/usr/bin/env node
/**
 * MindForge configuration validator
 * Validates MINDFORGE.md against the JSON schema
 * Usage: node bin/validate-config.js [path-to-MINDFORGE.md]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

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

const content = fs.readFileSync(CONFIG_PATH, 'utf8');
const schema  = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

const errors   = [];
const warnings = [];

// Parse key=value pairs from MINDFORGE.md
const settings = {};
const lines = content.split('\n');
lines.forEach(line => {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) {
    const [, key, value] = match;
    settings[key] = value.trim();
  }
});

// Validate against schema
for (const [key, def] of Object.entries(schema.properties || {})) {
  const value = settings[key];

  if (def.required && !value) {
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

  if (def.nonOverridable) {
    warnings.push(`${key}: this is a non-overridable governance primitive (value will be ignored)`);
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
