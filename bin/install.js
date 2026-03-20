#!/usr/bin/env node

/**
 * MindForge Installer
 * Usage: npx mindforge-cc [--claude|--antigravity|--all] [--global|--local]
 */

const fs = require('fs');
const path = require('path');

const VERSION = require('../package.json').version;
const ARGS = process.argv.slice(2);

const nodeVersion = process.versions.node.split('.').map(Number);
if (nodeVersion[0] < 18) {
  console.error('❌ MindForge requires Node.js 18 or higher.');
  console.error(`   Current version: ${process.versions.node}`);
  console.error('   Install Node.js 18 LTS: https://nodejs.org');
  process.exit(1);
}

// ── Argument parsing ──────────────────────────────────────────────────────────
const runtime = ARGS.includes('--antigravity') ? 'antigravity'
              : ARGS.includes('--all')          ? 'all'
              : 'claude'; // default

const scope = ARGS.includes('--global') ? 'global' : 'local';
const isUninstall = ARGS.includes('--uninstall');

// ── Target directories ────────────────────────────────────────────────────────
const home = process.env.HOME || process.env.USERPROFILE;
const cwd = process.cwd();

const targets = {
  claude: {
    global: path.join(home, '.claude'),
    local:  path.join(cwd, '.claude'),
    commandsDir: 'commands/mindforge',
  },
  antigravity: {
    global: path.join(home, '.gemini', 'antigravity'),
    local:  path.join(cwd, '.agent'),
    commandsDir: 'mindforge',
  },
};

// ── Utilities ─────────────────────────────────────────────────────────────────
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function safeCopyClaude(src, dest) {
  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, 'utf8');
    if (!existing.includes('MindForge')) {
      const backup = dest + '.backup-' + Date.now();
      fs.copyFileSync(dest, backup);
      console.log(`  ⚠️  Existing CLAUDE.md backed up to ${backup}`);
    }
  }
  copyFile(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath  = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function verifyInstall(targetBase, commandsDir) {
  const requiredFiles = [
    path.join(targetBase, 'CLAUDE.md'),
    path.join(commandsDir, 'help.md'),
    path.join(commandsDir, 'init-project.md'),
    path.join(commandsDir, 'plan-phase.md'),
    path.join(commandsDir, 'execute-phase.md'),
    path.join(commandsDir, 'verify-phase.md'),
    path.join(commandsDir, 'ship.md'),
  ];

  const missing = requiredFiles.filter(f => !fs.existsSync(f));

  if (missing.length > 0) {
    console.error('\n❌ Install verification failed. Missing files:');
    missing.forEach(f => console.error(`   ${f}`));
    console.error('\nTry re-running the installer.');
    process.exit(1);
  }

  console.log('  ✅ Install verified — all required files present');
}

// ── Install for a single runtime ──────────────────────────────────────────────
function install(runtimeName, explicitScope) {
  const cfg = targets[runtimeName];
  if (!cfg) {
    console.error(`Unknown runtime: ${runtimeName}`);
    process.exit(1);
  }

  const installScope = explicitScope || scope;
  const targetBase = installScope === 'global' ? cfg.global : cfg.local;
  const commandsDest = path.join(targetBase, cfg.commandsDir);

  console.log(`\n📦 Installing MindForge v${VERSION}`);
  console.log(`   Runtime : ${runtimeName}`);
  console.log(`   Scope   : ${installScope}`);
  console.log(`   Target  : ${targetBase}\n`);

  // Copy CLAUDE.md entry point
  const claudeSrc = path.join(__dirname, '..', '.claude', 'CLAUDE.md');
  if (fs.existsSync(claudeSrc)) {
    safeCopyClaude(claudeSrc, path.join(targetBase, 'CLAUDE.md'));
    console.log(`  ✅ CLAUDE.md`);
  }

  // Copy commands
  const commandsSrc = runtimeName === 'claude'
    ? path.join(__dirname, '..', '.claude', 'commands', 'mindforge')
    : path.join(__dirname, '..', '.agent', 'mindforge');

  if (fs.existsSync(commandsSrc)) {
    copyDir(commandsSrc, commandsDest);
    const count = fs.readdirSync(commandsSrc).length;
    console.log(`  ✅ ${count} commands → ${commandsDest}`);
  }

  // Copy .mindforge framework files to local project
  if (installScope === 'local') {
    const forgeSrc  = path.join(__dirname, '..', '.mindforge');
    const forgeDest = path.join(cwd, '.mindforge');
    if (fs.existsSync(forgeSrc)) {
      copyDir(forgeSrc, forgeDest);
      console.log(`  ✅ .mindforge/ framework files`);
    }

    // Copy .planning templates
    const planningSrc  = path.join(__dirname, '..', '.planning');
    const planningDest = path.join(cwd, '.planning');
    if (fs.existsSync(planningSrc) && !fs.existsSync(planningDest)) {
      copyDir(planningSrc, planningDest);
      console.log(`  ✅ .planning/ state templates`);
    } else if (fs.existsSync(planningDest)) {
      console.log(`  ⏭️  .planning/ already exists — skipped`);
    }
  }

  verifyInstall(targetBase, commandsDest);

  console.log(`\n✅ MindForge installed successfully!\n`);
  console.log(`Next steps:`);
  console.log(`  1. Open Claude Code or Antigravity in your project directory`);
  console.log(`  2. Run: /mindforge:help`);
  console.log(`  3. Run: /mindforge:init-project\n`);
}

// ── Uninstall ─────────────────────────────────────────────────────────────────
function uninstall(runtimeName, explicitScope) {
  const cfg = targets[runtimeName];
  const installScope = explicitScope || scope;
  const targetBase = installScope === 'global' ? cfg.global : cfg.local;
  const commandsDest = path.join(targetBase, cfg.commandsDir);

  console.log(`\n🗑️  Uninstalling MindForge`);
  console.log(`   Runtime : ${runtimeName}`);
  console.log(`   Scope   : ${installScope}`);

  if (fs.existsSync(commandsDest)) {
    fs.rmSync(commandsDest, { recursive: true, force: true });
    console.log(`  ✅ Removed ${commandsDest}`);
  }

  const claudeMd = path.join(targetBase, 'CLAUDE.md');
  // Only remove CLAUDE.md if it contains MindForge marker
  if (fs.existsSync(claudeMd)) {
    const content = fs.readFileSync(claudeMd, 'utf8');
    if (content.includes('MindForge')) {
      fs.unlinkSync(claudeMd);
      console.log(`  ✅ Removed CLAUDE.md`);
    } else {
      console.log(`  ⏭️  CLAUDE.md is not a MindForge file — preserved`);
    }
  }

  console.log(`\n✅ MindForge uninstalled.\n`);
}

async function runCli() {
  if (isUninstall) {
    if (runtime === 'all') {
      uninstall('claude');
      uninstall('antigravity');
    } else {
      uninstall(runtime);
    }
    return;
  }

  if (runtime === 'all') {
    install('claude');
    install('antigravity');
  } else {
    install(runtime);
  }
}

module.exports = { install, uninstall, verifyInstall, runCli };

// ── Entry point ───────────────────────────────────────────────────────────────
if (require.main === module) {
  runCli();
}
