// @timeout: 90000
'use strict';

/**
 * Tests for the programmatic worktree engine (bin/worktree/engine.js).
 * Exercises the two Layer-3 algorithms against a real temp git repo:
 *  - merge-readiness via `git merge-tree --write-tree` (must be NON-MUTATING)
 *  - lockfile-fingerprint dependency-cache symlinking
 * Plus branch-name validation and worktree lifecycle.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const engine = require('../bin/worktree/engine.js');

// Hermetic env: strip GIT_* context vars a parent `git commit` exports into hook
// subprocesses, which would redirect `git -C <tempRepo>` at the MindForge repo.
// This is what made the suite pass standalone but fail inside the pre-commit hook.
function hermeticEnv() {
  const env = { ...process.env };
  for (const k of ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE', 'GIT_PREFIX', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY']) delete env[k];
  return env;
}

function git(cwd, args, input) {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', input, env: hermeticEnv() });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

function mkRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-wt-'));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  git(repo, ['init', '-b', 'main']);
  git(repo, ['config', 'user.email', 'mf@example.com']);
  git(repo, ['config', 'user.name', 'MindForge']);
  fs.writeFileSync(path.join(repo, 'README.md'), 'hello\n');
  git(repo, ['add', 'README.md']);
  git(repo, ['commit', '-m', 'init']);
  return { root, repo };
}

function cleanup(repo, root) {
  // Prune any worktree registrations before removing the repo so a stale entry
  // in the repo-global worktree registry can never leak between test files.
  try { spawnSync('git', ['-C', repo, 'worktree', 'prune'], { encoding: 'utf8', env: hermeticEnv() }); } catch { /* ignore */ }
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
}

// Unique-per-call session id so concurrent/back-to-back worktree adds never
// collide on a branch name or worktree path.
let _sessionCounter = 0;
function sessionId() {
  _sessionCounter += 1;
  return `wt-test-${process.pid}-${_sessionCounter}`;
}

test('mergeReadinessForBranches reports READY for a non-conflicting branch', () => {
  const { root, repo } = mkRepo();
  try {
    git(repo, ['branch', 'feature']);
    git(repo, ['checkout', 'feature']);
    fs.writeFileSync(path.join(repo, 'new.txt'), 'branch only\n');
    git(repo, ['add', 'new.txt']);
    git(repo, ['commit', '-m', 'branch file']);
    git(repo, ['checkout', 'main']);

    const readiness = engine.mergeReadinessForBranches(repo, 'main', 'feature');
    assert.strictEqual(readiness.status, 'ready');
    assert.strictEqual(readiness.conflicts.length, 0);
  } finally { cleanup(repo, root); }
});

test('mergeReadinessForBranches reports CONFLICTED and is NON-MUTATING', () => {
  const { root, repo } = mkRepo();
  try {
    // diverge README on both branches
    git(repo, ['branch', 'feature']);
    git(repo, ['checkout', 'feature']);
    fs.writeFileSync(path.join(repo, 'README.md'), 'hello\nbranch\n');
    git(repo, ['commit', '-am', 'branch change']);
    git(repo, ['checkout', 'main']);
    fs.writeFileSync(path.join(repo, 'README.md'), 'hello\nmain\n');
    git(repo, ['commit', '-am', 'main change']);

    const headBefore = git(repo, ['rev-parse', 'HEAD']).trim();
    const statusBefore = git(repo, ['status', '--porcelain']);

    const readiness = engine.mergeReadinessForBranches(repo, 'main', 'feature');
    assert.strictEqual(readiness.status, 'conflicted');
    assert.deepStrictEqual(readiness.conflicts, ['README.md']);

    // NON-MUTATING: HEAD and working tree unchanged, no MERGE_HEAD created.
    assert.strictEqual(git(repo, ['rev-parse', 'HEAD']).trim(), headBefore);
    assert.strictEqual(git(repo, ['status', '--porcelain']), statusBefore);
    assert.ok(!fs.existsSync(path.join(repo, '.git', 'MERGE_HEAD')), 'no merge in progress');
  } finally { cleanup(repo, root); }
});

test('validateBranchName accepts valid and rejects invalid refs', () => {
  const { root, repo } = mkRepo();
  try {
    assert.doesNotThrow(() => engine.validateBranchName(repo, 'mindforge/agents/worker-1'));
    assert.throws(() => engine.validateBranchName(repo, 'bad branch name'));
  } finally { cleanup(repo, root); }
});

test('createForSession makes a worktree on a prefixed branch; remove cleans up', () => {
  const { root, repo } = mkRepo();
  try {
    const sid = sessionId();
    const wt = engine.createForSession(sid, {
      repoRoot: repo,
      worktreeRoot: path.join(root, 'worktrees'),
      branchPrefix: 'mindforge/agents',
    });
    assert.strictEqual(wt.branch, `mindforge/agents/${sid}`);
    assert.ok(fs.existsSync(wt.path), 'worktree dir exists');
    // branch resolves
    const resolved = git(repo, ['rev-parse', '--abbrev-ref', wt.branch]).trim();
    assert.strictEqual(resolved, `mindforge/agents/${sid}`);

    engine.remove(wt, repo);
    assert.ok(!fs.existsSync(wt.path), 'worktree dir removed');
  } finally { cleanup(repo, root); }
});

test('syncSharedDependencyDirs symlinks node_modules when lockfile fingerprint matches', () => {
  const { root, repo } = mkRepo();
  try {
    fs.writeFileSync(path.join(repo, 'package.json'), '{"name":"repo"}\n');
    fs.writeFileSync(path.join(repo, 'package-lock.json'), '{"lockfileVersion":3}\n');
    fs.mkdirSync(path.join(repo, 'node_modules'));
    fs.writeFileSync(path.join(repo, 'node_modules', '.marker'), 'shared\n');
    git(repo, ['add', 'package.json', 'package-lock.json']);
    git(repo, ['commit', '-m', 'add node deps']);

    const wt = engine.createForSession(sessionId(), {
      repoRoot: repo,
      worktreeRoot: path.join(root, 'worktrees'),
      branchPrefix: 'mindforge/agents',
    });

    const nm = path.join(wt.path, 'node_modules');
    assert.ok(fs.lstatSync(nm).isSymbolicLink(), 'node_modules is a symlink');
    assert.strictEqual(fs.readlinkSync(nm), path.join(repo, 'node_modules'));

    engine.remove(wt, repo);
  } finally { cleanup(repo, root); }
});
