'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, '.mindforge', 'dynamic-workflows', 'index.json');
const SCRIPTS_DIR = path.join(ROOT, '.mindforge', 'dynamic-workflows', 'scripts');
const AGENT_CMD_DIR = path.join(ROOT, '.agent', 'mindforge');
const CLAUDE_CMD_DIR = path.join(ROOT, '.claude', 'commands', 'mindforge');

function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') return null;
  const fields = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return fields;
    const sep = lines[i].indexOf(':');
    if (sep === -1) continue;
    const key = lines[i].slice(0, sep).trim();
    let val = lines[i].slice(sep + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
      val = val.slice(1, -1);
    }
    if (key) fields[key] = val;
  }
  return null;
}

// ── Test 1: registry index.json exists and is valid JSON ────────────────────
{
  assert.ok(fs.existsSync(REGISTRY_PATH), 'index.json must exist');
  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (e) {
    assert.fail(`index.json is not valid JSON: ${e.message}`);
  }
  assert.ok(Array.isArray(registry), 'index.json must be a JSON array');
  assert.ok(registry.length >= 12, `Expected at least 12 workflows, got ${registry.length}`);
  console.log(`  index.json: ${registry.length} workflows registered`);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

// ── Test 2: every registry entry has required fields ────────────────────────
for (const wf of registry) {
  assert.ok(wf.name, `Workflow entry missing "name": ${JSON.stringify(wf)}`);
  assert.ok(wf.description, `Workflow "${wf.name}" missing "description"`);
  assert.ok(wf.whenToUse, `Workflow "${wf.name}" missing "whenToUse"`);
  assert.ok(wf.tier, `Workflow "${wf.name}" missing "tier"`);
  assert.ok(wf.command, `Workflow "${wf.name}" missing "command"`);
  assert.ok(wf.scriptPath, `Workflow "${wf.name}" missing "scriptPath"`);
  assert.ok(Array.isArray(wf.phases) && wf.phases.length >= 2, `Workflow "${wf.name}" needs >= 2 phases`);
}
console.log(`  All ${registry.length} registry entries have required fields`);

// ── Test 3: every registry entry has a corresponding script file ─────────────
for (const wf of registry) {
  const scriptFile = path.join(ROOT, wf.scriptPath);
  assert.ok(
    fs.existsSync(scriptFile),
    `Script missing for "${wf.name}": ${wf.scriptPath}`
  );
}
console.log(`  All ${registry.length} script files exist`);

// ── Test 4: every script file has a valid meta export ────────────────────────
const scriptFiles = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js'));
for (const file of scriptFiles) {
  const content = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8');
  assert.ok(
    content.includes('export const meta'),
    `Script "${file}" must export a "meta" const`
  );
  assert.ok(
    content.includes('name:'),
    `Script "${file}" meta must include "name:"`
  );
  assert.ok(
    content.includes('description:'),
    `Script "${file}" meta must include "description:"`
  );
  assert.ok(
    content.includes('phases:'),
    `Script "${file}" meta must include "phases:"`
  );

  // meta.name must match filename
  const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
  if (nameMatch) {
    const expectedName = file.replace('.js', '');
    assert.strictEqual(
      nameMatch[1],
      expectedName,
      `Script "${file}" meta.name "${nameMatch[1]}" must match filename "${expectedName}"`
    );
  }
}
console.log(`  All ${scriptFiles.length} script files have valid meta exports`);

// ── Test 5: every workflow has paired command files ───────────────────────────
// .claude/ is gitignored and absent in CI — only validate .agent/mindforge/ in that case.
const claudeDirExists = fs.existsSync(CLAUDE_CMD_DIR);
for (const wf of registry) {
  const cmdName = wf.command.replace('/mindforge:', '') + '.md';
  const agentFile = path.join(AGENT_CMD_DIR, cmdName);

  assert.ok(
    fs.existsSync(agentFile),
    `Missing .agent/mindforge command: ${cmdName} (for workflow "${wf.name}")`
  );

  if (claudeDirExists) {
    const claudeFile = path.join(CLAUDE_CMD_DIR, cmdName);
    assert.ok(
      fs.existsSync(claudeFile),
      `Missing .claude/commands/mindforge command: ${cmdName} (for workflow "${wf.name}")`
    );
    // Both files must be identical (mirror requirement)
    const agentContent = fs.readFileSync(agentFile, 'utf8');
    const claudeContent = fs.readFileSync(claudeFile, 'utf8');
    assert.strictEqual(agentContent, claudeContent, `Command mirrors differ: ${cmdName}`);
  }
}
const mirrorNote = claudeDirExists ? 'mirrored' : '.agent/ only (CI — .claude/ gitignored)';
console.log(`  All ${registry.length} workflows have paired command files (${mirrorNote})`);

// ── Test 6: all wf-* command files have "description:" frontmatter ───────────
const wfCommandFiles = fs.readdirSync(AGENT_CMD_DIR).filter(f => f.startsWith('wf-'));
for (const file of wfCommandFiles) {
  const content = fs.readFileSync(path.join(AGENT_CMD_DIR, file), 'utf8');
  const fm = parseFrontmatter(content);
  assert.ok(fm && fm.description, `Command "${file}" missing "description:" in frontmatter`);
}
console.log(`  All ${wfCommandFiles.length} wf-* command files have valid frontmatter`);

// ── Test 7: tier values are valid ────────────────────────────────────────────
const VALID_TIERS = new Set(['research', 'dev', 'ops', 'intelligence']);
for (const wf of registry) {
  assert.ok(
    VALID_TIERS.has(wf.tier),
    `Workflow "${wf.name}" has invalid tier "${wf.tier}" (must be: ${[...VALID_TIERS].join(', ')})`
  );
}
console.log('  All tier values are valid');

console.log('\nworkflow-registry: all checks passed');
