#!/usr/bin/env node

/**
 * MindForge Installer
 * Usage: npx mindforge-cc [--claude|--antigravity|--all] [--global|--local]
 */

const fs = require('fs');
const path = require('path');

const VERSION = '0.1.0';
const ARGS = process.argv.slice(2);

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

// ── Install for a single runtime ──────────────────────────────────────────────
function install(runtimeName) {
  const cfg = targets[runtimeName];
  if (!cfg) {
    console.error(`Unknown runtime: ${runtimeName}`);
    process.exit(1);
  }

  const targetBase = scope === 'global' ? cfg.global : cfg.local;
  const commandsDest = path.join(targetBase, cfg.commandsDir);

  console.log(`\n📦 Installing MindForge v${VERSION}`);
  console.log(`   Runtime : ${runtimeName}`);
  console.log(`   Scope   : ${scope}`);
  console.log(`   Target  : ${targetBase}\n`);

  // Copy CLAUDE.md entry point
  const claudeSrc = path.join(__dirname, '..', '.claude', 'CLAUDE.md');
  if (fs.existsSync(claudeSrc)) {
    copyFile(claudeSrc, path.join(targetBase, 'CLAUDE.md'));
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
  if (scope === 'local') {
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

  console.log(`\n✅ MindForge installed successfully!\n`);
  console.log(`Next steps:`);
  console.log(`  1. Open Claude Code or Antigravity in your project directory`);
  console.log(`  2. Run: /mindforge:help`);
  console.log(`  3. Run: /mindforge:init-project\n`);
}

// ── Uninstall ─────────────────────────────────────────────────────────────────
function uninstall(runtimeName) {
  const cfg = targets[runtimeName];
  const targetBase = scope === 'global' ? cfg.global : cfg.local;
  const commandsDest = path.join(targetBase, cfg.commandsDir);

  console.log(`\n🗑️  Uninstalling MindForge`);
  console.log(`   Runtime : ${runtimeName}`);
  console.log(`   Scope   : ${scope}`);

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

// ── Entry point ───────────────────────────────────────────────────────────────
if (isUninstall) {
  if (runtime === 'all') {
    uninstall('claude');
    uninstall('antigravity');
  } else {
    uninstall(runtime);
  }
} else {
  if (runtime === 'all') {
    install('claude');
    install('antigravity');
  } else {
    install(runtime);
  }
}
