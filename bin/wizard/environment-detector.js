'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

async function detect() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const cwd = process.cwd();

  const runtimes = [];
  if (fs.existsSync(path.join(home, '.claude')) || fs.existsSync(path.join(cwd, '.claude'))) runtimes.push('claude');
  if (fs.existsSync(path.join(home, '.gemini', 'antigravity')) || fs.existsSync(path.join(cwd, '.agent'))) runtimes.push('antigravity');

  let projectType = 'unknown';
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = readJsonSafe(pkgPath) || {};
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps.next || deps.react) projectType = 'Next.js / React';
    else if (deps.fastify || deps.express) projectType = 'Node.js API';
    else projectType = 'Node.js';
  } else if (fs.existsSync(path.join(cwd, 'pyproject.toml'))) {
    projectType = 'Python';
  } else if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
    projectType = 'Rust';
  } else if (fs.existsSync(path.join(cwd, 'go.mod'))) {
    projectType = 'Go';
  }

  let packageManager = 'npm';
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
  else if (fs.existsSync(path.join(cwd, 'yarn.lock'))) packageManager = 'yarn';
  else if (fs.existsSync(path.join(cwd, 'bun.lockb'))) packageManager = 'bun';

  let existingInstall = false;
  let existingVersion = null;
  const claudePath = path.join(cwd, '.claude', 'CLAUDE.md');
  if (fs.existsSync(claudePath)) {
    const content = fs.readFileSync(claudePath, 'utf8');
    if (content.includes('MindForge')) {
      existingInstall = true;
      const m = content.match(/MindForge v(\d+\.\d+\.\d+)/);
      existingVersion = m ? m[1] : 'unknown';
    }
  }

  return {
    runtimes,
    hasGit: !!safeExec('git rev-parse --is-inside-work-tree'),
    projectType,
    packageManager,
    existingInstall,
    existingVersion,
    nodeVersion: process.versions.node,
    platform: process.platform,
  };
}

module.exports = { detect };
