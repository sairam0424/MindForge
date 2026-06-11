/**
 * MindForge — Config Manager atomic-write tests (v11.5.2 debt cleanup)
 * Run: node tests/config-manager.test.js
 *
 * config-manager.js exports a SINGLETON whose configPath is derived from
 * process.cwd() at require-time. To avoid clobbering the real
 * .mindforge/config.json, each test chdir's into a fresh temp dir, drops the
 * module from require.cache, then re-requires it so the fresh instance points
 * at the temp dir. cwd + cache are always restored in finally.
 *
 * The fix routes _save() through bin/utils/file-io.atomicWriteJSON (temp +
 * fsync + rename), so the rename-spy below observes the helper's
 * `${configPath}.tmp.${process.pid}` -> configPath commit.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const MODULE_PATH = require.resolve('../bin/governance/config-manager');

// Load a FRESH ConfigManager singleton rooted at `cwd` (a temp dir), so the
// real repo config.json is never touched. Returns the instance.
function freshConfigManager(cwd) {
  delete require.cache[MODULE_PATH];
  const prevCwd = process.cwd();
  process.chdir(cwd);
  try {
    return require('../bin/governance/config-manager');
  } finally {
    process.chdir(prevCwd);
    delete require.cache[MODULE_PATH]; // don't leak the temp-rooted instance
  }
}

test('set() persists the value to disk (survives a reload)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cfg-'));
  try {
    const cfg = freshConfigManager(tmp);
    cfg.set('feature.enabled', true);

    // Use the instance's own configPath: on macOS, process.cwd() resolves the
    // tmp dir to its /private realpath, so reconstructing from `tmp` would miss.
    const configFile = cfg.configPath;
    assert.ok(fs.existsSync(configFile), 'config.json must exist after set()');

    const onDisk = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    assert.strictEqual(onDisk.feature.enabled, true, 'value must be persisted on disk');
    assert.strictEqual(cfg.get('feature.enabled'), true, 'in-memory value must match');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('no .tmp.<pid> leftover remains after a successful write', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cfg-'));
  try {
    const cfg = freshConfigManager(tmp);
    cfg.set('a.b.c', 42);

    const dir = path.dirname(cfg.configPath);
    const leftovers = fs.readdirSync(dir).filter(f => f.includes('.tmp.'));
    assert.strictEqual(leftovers.length, 0, `no temp file must remain, found: ${leftovers.join(', ')}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('write is atomic: temp file is created then renamed (never a bare writeFileSync to configPath)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cfg-'));
  try {
    const cfg = freshConfigManager(tmp);
    const configFile = cfg.configPath; // realpath-resolved (see note above)
    const expectedTmp = `${configFile}.tmp.${process.pid}`;

    // Intercept renameSync to prove the temp-then-rename pattern is used: the
    // rename must move OUR temp path onto the final configPath.
    const realRename = fs.renameSync;
    let renamedFromTmp = false;
    let tmpExistedAtRename = false;
    fs.renameSync = (from, to) => {
      if (from === expectedTmp && to === configFile) {
        renamedFromTmp = true;
        tmpExistedAtRename = fs.existsSync(from);
      }
      return realRename(from, to);
    };
    try {
      cfg.set('atomic.check', 'ok');
    } finally {
      fs.renameSync = realRename;
    }

    assert.ok(renamedFromTmp, 'config must be committed via renameSync(tmp -> configPath)');
    assert.ok(tmpExistedAtRename, 'the temp file must exist at the moment of rename');
    assert.strictEqual(
      JSON.parse(fs.readFileSync(configFile, 'utf8')).atomic.check,
      'ok',
      'final config must contain the written value'
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nConfig Manager: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
