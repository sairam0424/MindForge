/**
 * The installer must never write THROUGH a symlink.
 *
 * THE DEFECT, reproduced with a canary against commit cd73230. `fs.writeFileSync` and
 * `fs.copyFileSync` open the destination O_WRONLY|O_CREAT|O_TRUNC and follow symlinks, and every
 * installer write funnels through two four-line helpers in bin/installer-core.js that had no lstat.
 * So a repository that commits its entry file as a symlink turned the documented install command into
 * an arbitrary-file overwrite:
 *
 *     $ ln -s <victim> <project>/CLAUDE.md          # git preserves symlinks
 *     $ npx mindforge-cc@latest --claude --local
 *
 *     victim before:  24 bytes   sha 2cfdbb20c25ced11
 *     victim after: 5646 bytes   sha 05b78d05307b2350          <- OVERWRITTEN
 *     <project>/CLAUDE.md.backup-<epoch> contains the victim's content   <- AND DISCLOSED
 *
 * Two harms in one step, both with the installing user's privileges. Point the link at anything they
 * can write — an SSH key, a credentials file, a shell profile — and the target is destroyed while its
 * previous contents are copied into a git working tree.
 *
 * The disclosure half needed its own guard. safeCopyClaude() reads the destination through the link
 * BEFORE replacing it, and writes what it read to `${dst}.backup-<epoch>` — a fresh regular path, so
 * a guard on the write primitives alone would never have fired on it. The check therefore runs at the
 * top of safeCopyClaude as well.
 *
 * WHY REFUSE RATHER THAN UNLINK. Unlinking would silently change the shape of the user's project.
 * Refusing leaves their file untouched and says why. An installer has no legitimate reason to write
 * through a link.
 *
 * NOT COVERED, and asserted as such below rather than left to be discovered: a symlinked DIRECTORY in
 * the destination path. mkdirSync and copyFileSync resolve those too, so a link at
 * `<project>/.claude` still redirects the tree. Closing it needs a containment check against the
 * install root, which differs between --local (cwd-relative) and global installs, so it is a separate
 * change. This file pins the file-level guarantee and documents the boundary honestly.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const INSTALL = path.join(REPO_ROOT, 'bin', 'install.js');
const CORE = path.join(REPO_ROOT, 'bin', 'installer-core.js');
const CANARY = 'CANARY-DO-NOT-OVERWRITE\n';

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const sha = (f) => require('node:crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex');

/**
 * Run a real `--claude --local` install in a throwaway project with HOME confined.
 *
 * HOME confinement is not optional hygiene here: the installer writes a project registry under
 * $HOME/.mindforge, and an earlier probe in this repository mutated the operator's real registry by
 * inheriting HOME.
 */
function installInto(project) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-symhome-')));
  try {
    const r = spawnSync(process.execPath, [INSTALL, '--claude', '--local'], {
      cwd: project, encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: home, CI: '1' },
    });
    return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
}

function withVictimAndProject(fn) {
  const victimDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-victim-')));
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-proj-')));
  const victim = path.join(victimDir, 'canary.txt');
  fs.writeFileSync(victim, CANARY);
  try { return fn({ victim, project }); }
  finally {
    fs.rmSync(victimDir, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
}

// ── the demonstrated attack ──────────────────────────────────────────────────

test('a symlinked entry file does NOT get followed — the victim survives untouched', () => {
  withVictimAndProject(({ victim, project }) => {
    const before = sha(victim);
    fs.symlinkSync(victim, path.join(project, 'CLAUDE.md'));

    const r = installInto(project);

    assert.strictEqual(sha(victim), before,
      'the victim file was MODIFIED. fs.copyFileSync follows symlinks, so an unguarded installer '
      + 'overwrites whatever the link points at — measured at 24 -> 5646 bytes before the guard.');
    assert.strictEqual(fs.readFileSync(victim, 'utf8'), CANARY, 'victim content must be byte-identical');
    assert.notStrictEqual(r.status, 0, 'the install must FAIL loudly rather than skip silently');
    assert.match(r.out, /REFUSING to write through a symlink/,
      `the refusal must name the problem. Got: ${r.out.slice(-400)}`);
  });
});

test('the victim content is NOT disclosed into the project as a backup', () => {
  // The second harm, and the reason the check also runs inside safeCopyClaude: it read the
  // destination THROUGH the link and wrote the result to ${dst}.backup-<epoch>, a fresh regular path
  // that the write-primitive guard could never have caught.
  withVictimAndProject(({ victim, project }) => {
    fs.symlinkSync(victim, path.join(project, 'CLAUDE.md'));
    installInto(project);

    const leaked = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isSymbolicLink()) continue;
        if (e.isDirectory()) { walk(p); continue; }
        let body = '';
        try { body = fs.readFileSync(p, 'utf8'); } catch { continue; }
        if (body.includes('CANARY-DO-NOT-OVERWRITE')) leaked.push(path.relative(project, p));
      }
    };
    walk(project);
    assert.deepStrictEqual(leaked, [],
      `${leaked.length} file(s) in the project carry the victim's content: ${leaked.join(', ')}. `
      + 'The backup path is inside the git working tree, so this is a disclosure, not just a copy.');
  });
});

test('a DANGLING symlink is refused too', () => {
  // A link to a non-existent path is the more dangerous variant: writing through it CREATES the
  // target, so an absent-file check would let it through.
  withVictimAndProject(({ project }) => {
    const target = path.join(os.tmpdir(), `mf-nonexistent-${process.pid}.txt`);
    fs.symlinkSync(target, path.join(project, 'CLAUDE.md'));
    const r = installInto(project);
    assert.notStrictEqual(r.status, 0, 'a dangling link must be refused, not silently created');
    assert.ok(!fs.existsSync(target),
      `the installer created ${target} through a dangling link`);
  });
});

// ── non-vacuity: the guard must not refuse everything ────────────────────────

test('a NORMAL install still succeeds and writes its entry file', () => {
  // The load-bearing control. A guard that refused every write would pass every assertion above while
  // breaking the product, and this repository's dominant defect is precisely a control that looks
  // like it works. Without this test, `assertNotSymlink = () => { throw }` would be green.
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-ok-')));
  try {
    const r = installInto(project);
    assert.strictEqual(r.status, 0, `a clean install must succeed. Output: ${r.out.slice(-400)}`);
    assert.ok(fs.existsSync(path.join(project, 'CLAUDE.md')), 'the entry file must be written');
    const count = (function walk(d) {
      let n = 0;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isSymbolicLink()) continue;
        n += e.isDirectory() ? walk(path.join(d, e.name)) : 1;
      }
      return n;
    })(project);
    assert.ok(count > 1000,
      `a clean install emitted only ${count} files (measured 1941). If this collapsed, the symlink `
      + 'guard is refusing legitimate writes.');
  } finally { fs.rmSync(project, { recursive: true, force: true }); }
});

test('a real regular file is still backed up and replaced', () => {
  // The behaviour the guard must NOT break: an existing non-MindForge CLAUDE.md is backed up, then
  // replaced. Only links are refused.
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-regular-')));
  try {
    fs.writeFileSync(path.join(project, 'CLAUDE.md'), '# my own instructions\nkeep me\n');
    const r = installInto(project);
    assert.strictEqual(r.status, 0, `install over a regular file must succeed: ${r.out.slice(-300)}`);
    const backups = fs.readdirSync(project).filter((f) => f.startsWith('CLAUDE.md.backup-'));
    assert.strictEqual(backups.length, 1, `expected exactly one backup, found ${backups.length}`);
    assert.match(fs.readFileSync(path.join(project, backups[0]), 'utf8'), /keep me/,
      'the backup must contain the user\'s original content');
  } finally { fs.rmSync(project, { recursive: true, force: true }); }
});

// ── the guard is wired where it matters ──────────────────────────────────────

test('both write primitives AND safeCopyClaude consult the guard', () => {
  // Structural, because a guard on one primitive leaves the other able to do the damage, and 20+
  // call sites funnel through them. safeCopyClaude needs its own call because it READS the
  // destination before any primitive runs.
  const src = fs.readFileSync(CORE, 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  assert.match(code, /function assertNotSymlink/, 'the guard must exist');
  assert.match(code, /lstatSync/, 'it must use lstatSync — statSync follows the link and sees the target');
  assert.match(code, /write:\s*\(p, t\) => \{ assertNotSymlink\(p\);/,
    'fsu.write must check its destination before writing');
  assert.match(code, /copy:\s*\(src, dst\) => \{ assertNotSymlink\(dst\);/,
    'fsu.copy must check its destination before copying');

  const safeCopy = code.slice(code.indexOf('function safeCopyClaude'));
  const guardIdx = safeCopy.indexOf('assertNotSymlink(dst)');
  const readIdx = safeCopy.indexOf('fsu.read(dst)');
  assert.ok(guardIdx > 0, 'safeCopyClaude must call the guard itself');
  assert.ok(readIdx === -1 || guardIdx < readIdx,
    'the guard must run BEFORE fsu.read(dst), or the victim\'s contents are read through the link '
    + 'and written to a backup path the primitive guard cannot see');
});

test('DOCUMENTED GAP: a symlinked DIRECTORY is not covered', () => {
  // Stated as a test so the boundary is visible in CI rather than only in a comment. The guard checks
  // the destination FILE; mkdirSync and copyFileSync also resolve a symlinked parent, so a link at
  // <project>/.claude still redirects the emitted tree outside the project.
  //
  // BIDIRECTIONAL: when containment lands, this test fails and tells you to delete it.
  const victimDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-dirvictim-')));
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-dirproj-')));
  try {
    fs.symlinkSync(victimDir, path.join(project, '.claude'));
    installInto(project);
    const escaped = fs.readdirSync(victimDir).length;
    assert.ok(escaped > 0,
      'a symlinked .claude/ no longer redirects the install — containment has landed. Delete this '
      + 'test and document the stronger guarantee.');
    assert.ok(true,
      `${escaped} entries were written outside the project through a directory symlink. This is the `
      + 'known, documented residual: the file-level guard does not cover a symlinked parent.');
  } finally {
    fs.rmSync(victimDir, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nInstaller Symlink Safety: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
