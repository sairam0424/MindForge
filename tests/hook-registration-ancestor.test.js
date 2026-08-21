'use strict';
/**
 * REG-01: an ancestor .claude must not suppress hook registration.
 *
 * WHAT SHIPPED IN 11.9.3. register() called ancestorClaudeDir() and, on any hit, returned
 * status 'skipped' with "the harness will read <ancestor>/.claude/settings.json, not this
 * directory". Three measurements against that:
 *
 *   - It tested for a DIRECTORY named .claude, so it tripped on ~/.claude — i.e. on every project
 *     under $HOME. The gates the shipped CLAUDE.md calls MANDATORY were copied in and left inert.
 *   - ~/.claude/settings.json is the USER TIER. Claude Code applies it in addition to the project
 *     tier, so its existence carries no information about whether a project file is read.
 *   - For a genuine project ancestor the claim is false too: an ancestor two levels up carried a
 *     PreToolUse Bash hook appending a marker to a log, and across a dozen Bash calls with the inner
 *     directory as the project root that log was never created. The ancestor's settings are not read
 *     either, so skipping delivered the gates nowhere rather than somewhere else.
 *
 * These tests pin the corrected contract: warn, never skip; ignore $HOME; require a settings.json
 * FILE. Each was falsified by reverting the corresponding line and confirming it goes red.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const reg = require(path.join(ROOT, 'bin', 'installer', 'hook-registration.js'));

/**
 * A project directory with an ancestor chain we control, held OUTSIDE $HOME so the real home
 * directory can never be one of the ancestors walked. fs.realpathSync collapses /var -> /private/var
 * on macOS, which matters because the detector compares resolved paths.
 */
function scratch(name) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `mf-anc-${name}-`)));
  const project = path.join(base, 'outer', 'inner');
  fs.mkdirSync(project, { recursive: true });
  return { base, outer: path.join(base, 'outer'), project };
}

function writeSettings(dir, body) {
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), `${JSON.stringify(body, null, 2)}\n`);
}

test('an ancestor project settings.json is detected — the warning is not vacuous', () => {
  const { outer, project } = scratch('detect');
  writeSettings(outer, { hooks: { PreToolUse: [] } });
  assert.strictEqual(reg.shadowingProjectSettings(project), outer,
    'the detector found nothing, so every other test here would pass by never firing. A warning that '
    + 'cannot trigger is the same class of defect as a gate that cannot fail.');
});

test('a bare .claude DIRECTORY is not an ancestor settings file', () => {
  const { outer, project } = scratch('bare');
  fs.mkdirSync(path.join(outer, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(outer, '.claude', 'NOTES.md'), '# just docs\n');
  assert.strictEqual(reg.shadowingProjectSettings(project), null,
    'a directory named .claude that holds no settings.json was treated as one. This is the exact '
    + 'shape that fired on the author\'s machine: an ancestor .claude holding only markdown. The '
    + 'check must be for the FILE the reason names, not for its parent directory.');
});

test('$HOME is never reported as shadowing — it is a settings TIER, not a competing project', () => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-anc-home-')));
  const project = path.join(home, 'proj');
  fs.mkdirSync(project, { recursive: true });
  writeSettings(home, { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [] }] } });

  const realHome = process.env.HOME;
  try {
    process.env.HOME = home;   // os.homedir() honours $HOME on POSIX
    assert.strictEqual(os.homedir(), home, 'confinement failed — refusing to assert against the real home');
    assert.strictEqual(reg.shadowingProjectSettings(project), null,
      'the user-tier settings file was reported as shadowing the project. Since ~/.claude/settings.json '
      + 'exists on any machine that has ever run Claude Code, this is the condition that made the '
      + 'suppression universal.');
  } finally {
    if (realHome === undefined) delete process.env.HOME; else process.env.HOME = realHome;
  }
});

test('register() WARNS about an ancestor and still emits the hooks — it does not skip', () => {
  const { outer, project } = scratch('noskip');
  writeSettings(outer, { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [] }] } });

  const result = reg.register({
    projectRoot: project,
    repoRoot: ROOT,
    runtime: 'claude',
    scope: 'local',
    selfInstall: false,
    dryRun: true,      // dry-run: assert the decision and the payload, write nothing
  });

  assert.notStrictEqual(result.status, 'skipped',
    `register() skipped on ancestor grounds: ${result.reason}. An install under an ancestor project — `
    + 'or, before the $HOME fix, any install at all — copies the hook scripts and registers none of '
    + 'them, so the shipped CLAUDE.md calls gates MANDATORY that no tool call ever reaches.');
  assert.strictEqual(result.status, 'dry-run');

  assert.ok(Array.isArray(result.warnings) && result.warnings.length === 1,
    'the ancestor produced no warning. Demoting the skip to a warning is only an improvement if the '
    + 'operator actually hears it; silently registering would trade one omission for another.');
  assert.match(result.warnings[0], /ancestor project/,
    'the warning does not identify what it is about');
  assert.ok(result.warnings[0].includes(outer),
    'the warning does not name the directory it found, so the operator cannot act on it');

  // The payload must be the real thing, not an empty shell that happens not to be 'skipped'.
  const emitted = JSON.parse(result.preview);
  const commands = Object.values(emitted.hooks || {}).flat()
    .flatMap((g) => (g && g.hooks) || []).map((h) => h && h.command).filter(Boolean);
  const owned = commands.filter((cmd) => reg.isOwned(cmd));
  assert.strictEqual(owned.length, reg.HOOK_SPEC.length,
    `emitted ${owned.length} owned commands, expected ${reg.HOOK_SPEC.length} — the ancestor path `
    + 'returns a non-skip status but not a complete registration');
});

test('with no ancestor settings file there is no warning to print', () => {
  const { project } = scratch('clean');
  const result = reg.register({
    projectRoot: project,
    repoRoot: ROOT,
    runtime: 'claude',
    scope: 'local',
    selfInstall: false,
    dryRun: true,
  });
  assert.strictEqual(result.status, 'dry-run');
  assert.deepStrictEqual(result.warnings, [],
    'a warning was produced with nothing to warn about. A warning that always fires is noise the '
    + 'operator learns to skip past, which is how the real one gets missed.');
});

test('the installer prints hook warnings, and its docs pointer resolves', () => {
  const core = fs.readFileSync(path.join(ROOT, 'bin', 'installer-core.js'), 'utf8');
  const code = core.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  assert.match(code, /hookRegistration\.warnings/,
    'installer-core.js never reads hookRegistration.warnings, so the ancestor advisory is computed, '
    + 'stored in the receipt, and never shown to the person running the installer.');

  const doc = path.join(ROOT, 'docs', 'troubleshooting.md');
  assert.ok(fs.existsSync(doc), 'docs/troubleshooting.md is missing but the installer points at it');
  const text = fs.readFileSync(doc, 'utf8');
  assert.match(text, /Hooks are installed but nothing is blocked/,
    'the installer tells an operator whose hooks are not registered to see a section of '
    + 'docs/troubleshooting.md that does not exist. Measured before this fix: the word "hook" appeared '
    + '0 times in that file, so the one pointer offered on the failure path led nowhere.');
});
