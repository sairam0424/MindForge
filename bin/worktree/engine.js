/**
 * MindForge — Programmatic Git Worktree Engine
 *
 * Ported from ECC's Rust worktree module (ecc2/src/worktree/mod.rs) to Node via
 * child_process git calls (the Rust impl is structured git CLI invocations — no
 * git2 bindings needed). Turns MindForge's prose worktree instructions into a
 * tested engine.
 *
 * Two Layer-3 ideas ported faithfully:
 *  1. merge_readiness(): `git merge-tree --write-tree` + CONFLICT-line parsing —
 *     detects merge conflicts WITHOUT touching the working tree or creating a
 *     merge commit. Pure preview.
 *  2. syncSharedDependencyDirs(): lockfile-fingerprint dependency-cache
 *     symlinking — links node_modules/target/.venv from the base checkout into a
 *     new worktree ONLY when the dependency fingerprint matches, so parallel
 *     agents share warm caches without re-installing.
 *
 * Plus: hunk-level stage/unstage/reset via `git apply`, rebase-with-auto-abort,
 * draft-PR via gh, branch-name validation, status parsing.
 *
 * Used by /mindforge:worktrees and the mindforge-swarm-execution skill.
 */
'use strict';

const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── git invocation helper ─────────────────────────────────────────────────────

/**
 * Build a hermetic env for git subprocesses: strip the GIT_* context vars that a
 * caller (notably a `git commit` pre-commit hook) exports, which would otherwise
 * redirect `git -C <dir>` at the PARENT repo's gitdir/index/worktree instead of
 * the target directory. Without this, worktree ops run inside a pre-commit hook
 * silently operate on the wrong repo.
 */
function hermeticGitEnv() {
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE', 'GIT_PREFIX', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY']) {
    delete env[key];
  }
  return env;
}

/**
 * Run a git command in a given directory. Returns { ok, stdout, stderr, status }.
 * Never throws on non-zero exit — callers decide how to handle failure.
 */
function git(cwd, args, opts = {}) {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    input: opts.input,
    timeout: opts.timeout || 120_000,
    maxBuffer: 32 * 1024 * 1024,
    env: hermeticGitEnv(),
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
    error: result.error,
  };
}

function gitOrThrow(cwd, args, context, opts) {
  const r = git(cwd, args, opts);
  if (!r.ok) {
    throw new Error(`${context}: ${r.stderr.trim() || r.error?.message || 'git failed'}`);
  }
  return r.stdout;
}

// ── branch / status primitives ────────────────────────────────────────────────

function getCurrentBranch(repoRoot) {
  return gitOrThrow(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD'], 'get current branch').trim();
}

function validateBranchName(repoRoot, branch) {
  const r = git(repoRoot, ['check-ref-format', '--branch', branch]);
  if (!r.ok) {
    const msg = r.stderr.trim() || 'branch name is not a valid git ref';
    throw new Error(msg);
  }
}

function branchHeadOid(repoRoot, branch) {
  return gitOrThrow(repoRoot, ['rev-parse', branch], 'git rev-parse').trim();
}

function statusShort(cwd) {
  const r = git(cwd, ['status', '--short']);
  if (!r.ok) return [];
  return r.stdout.split('\n').map(l => l.trim()).filter(Boolean);
}

function hasUncommittedChanges(worktreePath) {
  return statusShort(worktreePath).length > 0;
}

/**
 * Parse `git status --porcelain=v1` into structured entries.
 */
function statusEntries(worktreePath) {
  const out = gitOrThrow(worktreePath, ['status', '--porcelain=v1', '--untracked-files=all'], 'git status');
  return out.split('\n').map(parseStatusLine).filter(Boolean);
}

function parseStatusLine(line) {
  if (line.length < 4) return null;
  const indexStatus = line[0];
  const worktreeStatus = line[1];
  const rawPath = line.slice(3).trim();
  if (!rawPath) return null;
  const displayPath = rawPath;
  const normalizedPath = rawPath.includes(' -> ') ? rawPath.split(' -> ').pop().trim() : rawPath;
  const conflicted =
    indexStatus === 'U' || worktreeStatus === 'U' ||
    (indexStatus === 'A' && worktreeStatus === 'A') ||
    (indexStatus === 'D' && worktreeStatus === 'D');
  return {
    path: normalizedPath,
    displayPath,
    indexStatus,
    worktreeStatus,
    staged: indexStatus !== ' ' && indexStatus !== '?',
    unstaged: worktreeStatus !== ' ' && worktreeStatus !== '?',
    untracked: indexStatus === '?' && worktreeStatus === '?',
    conflicted,
  };
}

// ── Layer-3 #1: non-mutating merge-readiness ──────────────────────────────────

/**
 * Detect whether `rightBranch` merges cleanly into `leftBranch` WITHOUT touching
 * the working tree, using `git merge-tree --write-tree`. Returns
 * { status: 'ready'|'conflicted', summary, conflicts: string[] }.
 */
function mergeReadinessForBranches(repoRoot, leftBranch, rightBranch) {
  const r = git(repoRoot, ['merge-tree', '--write-tree', leftBranch, rightBranch]);
  const merged = `${r.stdout}\n${r.stderr}`;
  const conflicts = merged.split('\n').map(parseMergeConflictPath).filter(Boolean);

  if (r.ok) {
    return {
      status: 'ready',
      summary: `Merge ready: ${rightBranch} into ${leftBranch}`,
      conflicts: [],
    };
  }

  if (conflicts.length > 0) {
    const head = conflicts.slice(0, 3).join(', ');
    const overflow = conflicts.length - 3;
    const detail = overflow > 0 ? `${head}, +${overflow} more` : head;
    return {
      status: 'conflicted',
      summary: `Merge blocked between ${leftBranch} and ${rightBranch} by ${conflicts.length} conflict(s): ${detail}`,
      conflicts,
    };
  }

  throw new Error(`git merge-tree failed: ${r.stderr.trim()}`);
}

function parseMergeConflictPath(line) {
  if (!line.includes('CONFLICT')) return null;
  const parts = line.split(' in ');
  if (parts.length < 2) return null;
  const p = parts[1].trim();
  return p || null;
}

/**
 * merge-readiness for a worktree {path, branch, baseBranch} — convenience
 * wrapper that runs the branch check from the base checkout.
 */
function mergeReadiness(worktree) {
  const repoRoot = baseCheckoutPath(worktree);
  const readiness = mergeReadinessForBranches(repoRoot, worktree.baseBranch, worktree.branch);
  if (readiness.status === 'ready') {
    readiness.summary = `Merge ready into ${worktree.baseBranch}`;
  }
  return readiness;
}

// ── worktree lifecycle ────────────────────────────────────────────────────────

/**
 * Create a worktree for a session id under worktreeRoot, on a new branch
 * `<branchPrefix>/<sessionId>`. Returns { path, branch, baseBranch }.
 * Also syncs shared dependency caches (Layer-3 #2).
 */
function createForSession(sessionId, opts = {}) {
  const repoRoot = opts.repoRoot || process.cwd();
  const worktreeRoot = opts.worktreeRoot || path.join(repoRoot, '.mindforge', 'worktrees');
  const branchPrefix = (opts.branchPrefix || 'mindforge/agents').trim().replace(/^\/+|\/+$/g, '');
  if (!branchPrefix) throw new Error('branchPrefix cannot be empty');

  const branch = `${branchPrefix}/${sessionId}`;
  validateBranchName(repoRoot, branch);

  const base = getCurrentBranch(repoRoot);
  const wtPath = path.join(worktreeRoot, sessionId);
  fs.mkdirSync(worktreeRoot, { recursive: true });

  gitOrThrow(repoRoot, ['worktree', 'add', '-b', branch, wtPath, 'HEAD'], 'git worktree add');

  const info = { path: wtPath, branch, baseBranch: base };
  try {
    syncSharedDependencyDirs(info, repoRoot);
  } catch (e) {
    process.stderr.write(`[worktree] shared dependency cache sync warning: ${e.message}\n`);
  }
  return info;
}

function remove(worktree, repoRoot) {
  const root = repoRoot || tryBaseCheckoutPath(worktree);
  if (!root) {
    if (fs.existsSync(worktree.path)) fs.rmSync(worktree.path, { recursive: true, force: true });
    return;
  }
  const r = git(root, ['worktree', 'remove', '--force', worktree.path]);
  if (!r.ok && fs.existsSync(worktree.path)) {
    fs.rmSync(worktree.path, { recursive: true, force: true });
  }
  git(root, ['branch', '-D', worktree.branch]); // best-effort
  // Prune any stale registration so a removed worktree's path can be reused and
  // never collides with a later `git worktree add` (the registry is repo-global).
  git(root, ['worktree', 'prune']);
}

function list() {
  const r = git(process.cwd(), ['worktree', 'list', '--porcelain']);
  if (!r.ok) throw new Error(`git worktree list failed: ${r.stderr.trim()}`);
  return r.stdout.split('\n').filter(l => l.startsWith('worktree ')).map(l => l.slice('worktree '.length).trim());
}

/**
 * Resolve the base checkout path for a worktree by parsing `git worktree list
 * --porcelain` and matching the base branch (falls back to the first non-self
 * worktree).
 */
function baseCheckoutPath(worktree) {
  const p = tryBaseCheckoutPath(worktree);
  if (!p) throw new Error(`Failed to locate base checkout for ${worktree.baseBranch}`);
  return p;
}

function tryBaseCheckoutPath(worktree) {
  const r = git(worktree.path, ['worktree', 'list', '--porcelain']);
  if (!r.ok) return null;

  const targetBranch = `refs/heads/${worktree.baseBranch}`;
  let currentPath = null;
  let currentBranch = null;
  let fallback = null;

  const finalize = () => {
    if (currentPath) {
      if (!fallback && currentPath !== worktree.path) fallback = currentPath;
      if (currentBranch === targetBranch && currentPath !== worktree.path) return currentPath;
    }
    return null;
  };

  for (const line of r.stdout.split('\n')) {
    if (line === '') {
      const hit = finalize();
      if (hit) return hit;
      currentPath = null;
      currentBranch = null;
      continue;
    }
    if (line.startsWith('worktree ')) currentPath = line.slice('worktree '.length).trim();
    else if (line.startsWith('branch ')) currentBranch = line.slice('branch '.length).trim();
  }
  const hit = finalize();
  return hit || fallback;
}

// ── Layer-3 #2: lockfile-fingerprint dependency-cache symlinking ──────────────

function detectSharedDependencyStrategies(repoRoot) {
  const strategies = [];
  const has = f => fs.existsSync(path.join(repoRoot, f));
  const isDir = d => { try { return fs.statSync(path.join(repoRoot, d)).isDirectory(); } catch { return false; } };

  if (isDir('node_modules') && has('package.json')) {
    if (has('pnpm-lock.yaml')) strategies.push({ label: 'node_modules (pnpm)', dir: 'node_modules', fingerprint: ['package.json', 'pnpm-lock.yaml'] });
    else if (has('bun.lockb')) strategies.push({ label: 'node_modules (bun)', dir: 'node_modules', fingerprint: ['package.json', 'bun.lockb'] });
    else if (has('yarn.lock')) strategies.push({ label: 'node_modules (yarn)', dir: 'node_modules', fingerprint: ['package.json', 'yarn.lock'] });
    else if (has('package-lock.json')) strategies.push({ label: 'node_modules (npm)', dir: 'node_modules', fingerprint: ['package.json', 'package-lock.json'] });
  }
  if (isDir('target') && has('Cargo.toml')) {
    const fp = ['Cargo.toml'];
    if (has('Cargo.lock')) fp.push('Cargo.lock');
    strategies.push({ label: 'target (cargo)', dir: 'target', fingerprint: fp });
  }
  if (isDir('.venv')) {
    const pyFiles = ['uv.lock', 'poetry.lock', 'Pipfile.lock', 'requirements.txt', 'pyproject.toml', 'setup.py', 'setup.cfg'].filter(has);
    if (pyFiles.length) strategies.push({ label: '.venv (python)', dir: '.venv', fingerprint: pyFiles });
  }
  return strategies;
}

function dependencyFingerprint(root, files) {
  const hasher = crypto.createHash('sha256');
  for (const rel of files) {
    const content = fs.readFileSync(path.join(root, rel));
    hasher.update(rel);
    hasher.update(Buffer.from([0]));
    hasher.update(content);
    hasher.update(Buffer.from([0xff]));
  }
  return hasher.digest('hex');
}

function syncSharedDependencyDirs(worktree, repoRoot) {
  const root = repoRoot || baseCheckoutPath(worktree);
  const applied = [];
  for (const strategy of detectSharedDependencyStrategies(root)) {
    if (syncOneDependencyDir(worktree, root, strategy)) applied.push(strategy.label);
  }
  return applied;
}

function syncOneDependencyDir(worktree, repoRoot, strategy) {
  const rootDir = path.join(repoRoot, strategy.dir);
  if (!fs.existsSync(rootDir)) return false;

  const wtDir = path.join(worktree.path, strategy.dir);
  const rootFp = dependencyFingerprint(repoRoot, strategy.fingerprint);
  let wtFp = null;
  try { wtFp = dependencyFingerprint(worktree.path, strategy.fingerprint); } catch { wtFp = null; }

  // Fingerprints diverge → do NOT share; ensure worktree has its own real dir.
  if (wtFp !== rootFp) {
    if (isSymlink(wtDir)) {
      fs.rmSync(wtDir, { force: true });
      fs.mkdirSync(wtDir, { recursive: true });
    }
    return false;
  }

  if (fs.existsSync(wtDir)) {
    return isSymlinkTo(wtDir, rootDir);
  }

  fs.symlinkSync(rootDir, wtDir, 'dir');
  return true;
}

function isSymlink(p) {
  try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; }
}

function isSymlinkTo(p, target) {
  if (!isSymlink(p)) return false;
  try { return fs.readlinkSync(p) === target; } catch { return false; }
}

// ── hunk-level staging via git apply ──────────────────────────────────────────

function diffPatchTextForPaths(cwd, extraArgs, paths) {
  if (!paths.length) return '';
  const r = git(cwd, ['diff', '--patch', '--find-renames', ...extraArgs, '--', ...paths]);
  if (!r.ok) throw new Error(`git diff failed: ${r.stderr.trim()}`);
  return r.stdout;
}

/**
 * Extract per-hunk patches (each carrying the file header) so a single hunk can
 * be applied independently via `git apply`.
 */
function extractPatchHunks(section, patchText) {
  const lines = patchText.split('\n');
  const diffStart = lines.findIndex(l => l.startsWith('diff --git '));
  if (diffStart === -1) return [];
  let firstHunk = -1;
  for (let i = diffStart; i < lines.length; i++) {
    if (lines[i].startsWith('@@')) { firstHunk = i; break; }
  }
  if (firstHunk === -1) return [];

  const header = lines.slice(diffStart, firstHunk);
  const hunkStarts = [];
  for (let i = firstHunk; i < lines.length; i++) {
    if (lines[i].startsWith('@@')) hunkStarts.push(i);
  }

  return hunkStarts.map((start, idx) => {
    const end = hunkStarts[idx + 1] ?? lines.length;
    const patchLines = [...header, ...lines.slice(start, end)];
    return { section, header: lines[start], patch: patchLines.join('\n') + '\n' };
  });
}

function statusPatchView(worktree, entry) {
  if (entry.untracked) return null;
  const stagedPatch = diffPatchTextForPaths(worktree.path, ['--cached'], [entry.path]);
  const unstagedPatch = diffPatchTextForPaths(worktree.path, [], [entry.path]);
  const hunks = [];
  if (stagedPatch.trim()) hunks.push(...extractPatchHunks('staged', stagedPatch));
  if (unstagedPatch.trim()) hunks.push(...extractPatchHunks('unstaged', unstagedPatch));
  if (!hunks.length) return null;
  return { path: entry.path, displayPath: entry.displayPath, hunks };
}

function applyPatch(cwd, args, patch, action) {
  const r = git(cwd, ['apply', ...args], { input: patch });
  if (!r.ok) throw new Error(`git apply failed while trying to ${action}: ${r.stderr.trim()}`);
}

function stageHunk(worktree, hunk) {
  if (hunk.section !== 'unstaged') throw new Error('selected hunk is already staged');
  applyPatch(worktree.path, ['--cached'], hunk.patch, 'stage selected hunk');
}

function unstageHunk(worktree, hunk) {
  if (hunk.section !== 'staged') throw new Error('selected hunk is not staged');
  applyPatch(worktree.path, ['-R', '--cached'], hunk.patch, 'unstage selected hunk');
}

// ── rebase with auto-abort ────────────────────────────────────────────────────

function rebaseOntoBase(worktree) {
  if (hasUncommittedChanges(worktree.path)) {
    throw new Error(`Worktree ${worktree.branch} has uncommitted changes; commit or discard them before rebasing`);
  }
  const repoRoot = baseCheckoutPath(worktree);
  const before = branchHeadOid(repoRoot, worktree.branch);

  const r = git(worktree.path, ['rebase', worktree.baseBranch]);
  if (!r.ok) {
    git(worktree.path, ['rebase', '--abort']); // best-effort cleanup
    throw new Error(`git rebase failed: ${(r.stdout + '\n' + r.stderr).trim()}`);
  }

  const after = branchHeadOid(repoRoot, worktree.branch);
  return {
    branch: worktree.branch,
    baseBranch: worktree.baseBranch,
    alreadyUpToDate: before === after || (r.stdout + r.stderr).includes('up to date'),
  };
}

// ── draft PR via gh ───────────────────────────────────────────────────────────

function createDraftPr(worktree, title, body, options = {}) {
  if (!title || !title.trim()) throw new Error('PR title cannot be empty');
  const baseBranch = (options.baseBranch || '').trim() || worktree.baseBranch;

  const push = git(worktree.path, ['push', '-u', 'origin', worktree.branch]);
  if (!push.ok) throw new Error(`git push failed: ${push.stderr.trim()}`);

  const ghArgs = ['pr', 'create', '--draft', '--base', baseBranch, '--head', worktree.branch, '--title', title.trim(), '--body', body || ''];
  for (const label of (options.labels || []).map(s => s.trim()).filter(Boolean)) ghArgs.push('--label', label);
  for (const reviewer of (options.reviewers || []).map(s => s.trim()).filter(Boolean)) ghArgs.push('--reviewer', reviewer);

  const result = spawnSync('gh', ghArgs, { cwd: worktree.path, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`gh pr create failed: ${(result.stderr || '').trim()}`);
  return (result.stdout || '').trim();
}

module.exports = {
  // lifecycle
  createForSession,
  remove,
  list,
  baseCheckoutPath,
  // merge readiness (Layer-3 #1)
  mergeReadiness,
  mergeReadinessForBranches,
  // dependency cache (Layer-3 #2)
  syncSharedDependencyDirs,
  detectSharedDependencyStrategies,
  dependencyFingerprint,
  // status + hunks
  statusEntries,
  statusPatchView,
  stageHunk,
  unstageHunk,
  hasUncommittedChanges,
  // rebase / PR
  rebaseOntoBase,
  createDraftPr,
  // primitives (exported for tests)
  validateBranchName,
  getCurrentBranch,
  branchHeadOid,
};
