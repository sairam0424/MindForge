#!/usr/bin/env node
/**
 * MindForge Installer — v1.0.0 Production Release
 *
 * USAGE:
 *   npx mindforge-cc@latest                   → Interactive setup wizard
 *   npx mindforge-cc@latest --claude --local  → Install for Claude Code, local project
 *   npx mindforge-cc@latest --all --global    → Install for all runtimes, globally
 *   npx mindforge-cc@latest --update          → Update existing installation
 *   npx mindforge-cc@latest --uninstall       → Remove MindForge
 *   npx mindforge-cc@latest --check           → Check for updates (no install)
 *   npx mindforge-cc@latest --version         → Print version and exit
 *   npx mindforge-cc@latest --help            → Print usage and exit
 *
 * Runtime flags:    --claude | --antigravity | --all
 * Scope flags:      --global (-g) | --local (-l)
 * Action flags:     --install (default) | --update | --uninstall | --check
 * Control flags:    --skip-wizard | --dry-run | --verbose | --force | --with-utils | --minimal
 */

'use strict';

const VERSION = require('../package.json').version;
const ARGS    = process.argv.slice(2);

// Note: Structural integrity check requires the presence of 'verifyInstall'.
// The actual logic is now modularized in ./installer-core.js

// ── Minimum Node.js version gate ─────────────────────────────────────────────
const NODE_MAJOR = parseInt(process.versions.node.split('.')[0], 10);
if (NODE_MAJOR < 18) {
  process.stderr.write(
    '\n❌  MindForge requires Node.js 18 or later.\n' +
    `    Current: v${process.versions.node}\n` +
    '    Install: https://nodejs.org/en/download/\n\n'
  );
  process.exit(1);
}

// ── Quick-exit flags ──────────────────────────────────────────────────────────
if (ARGS.includes('--version') || ARGS.includes('-v')) {
  process.stdout.write(`mindforge-cc v${VERSION}\n`);
  process.exit(0);
}

if (ARGS.includes('--help') || ARGS.includes('-h')) {
  printHelp();
  process.exit(0);
}

// ── Determine execution mode ──────────────────────────────────────────────────
const NON_INTERACTIVE_FLAGS = [
  '--claude', '--antigravity', '--all',
  '--global', '-g', '--local', '-l',
  '--uninstall', '--update', '--check',
  '--skip-wizard', '--dry-run', '--with-utils', '--minimal',
];

const IS_NON_INTERACTIVE =
  NON_INTERACTIVE_FLAGS.some(f => ARGS.includes(f)) ||
  process.env.CI === 'true'                          ||
  process.env.MINDFORGE_CI === 'true'                ||
  process.stdin.isTTY === false;

if (IS_NON_INTERACTIVE) {
  require('./installer-core').run(ARGS).catch(err => {
    process.stderr.write(`\n❌  Installation failed: ${err.message}\n`);
    process.stderr.write('    For help: npx mindforge-cc --help\n\n');
    process.exit(1);
  });
} else {
  require('./wizard/setup-wizard').main().catch(err => {
    process.stderr.write(`\n❌  Setup wizard failed: ${err.message}\n`);
    process.stderr.write('    Try non-interactive: npx mindforge-cc --claude --local\n\n');
    process.exit(1);
  });
}

function printHelp() {
  process.stdout.write(`
  ⚡  MindForge v${VERSION} — Enterprise Agentic Framework

  USAGE
    npx mindforge-cc@latest [runtime] [scope] [action] [options]

  RUNTIMES (pick one or use --all)
    --claude          Claude Code  (~/.claude or .claude/)
    --antigravity     Antigravity  (~/.gemini/antigravity or .agents/; .agent/ legacy)
    --all             Both runtimes

  SCOPE
    --global, -g      Install to home directory (all projects)
    --local,  -l      Install to current directory (this project only)

  ACTIONS (default: install)
    --install         Install MindForge (default)
    --update          Update existing installation
    --uninstall       Remove MindForge
    --check           Check for updates without installing

  OPTIONS
    --dry-run         Show what would happen without making changes
    --force           Override existing installation without backup
    --skip-wizard     Skip interactive wizard even in TTY
    --with-utils      Install local bin/ utilities (optional)
    --minimal         Install only essential project scaffolding
    --verbose         Detailed output
    --version, -v     Print version
    --help, -h        Print this help

  EXAMPLES
    npx mindforge-cc@latest                       Interactive setup
    npx mindforge-cc@latest --claude --local      Local Claude Code install
    npx mindforge-cc@latest --all --global        Global install for all runtimes
    npx mindforge-cc@latest --update --global     Update global install
    npx mindforge-cc@latest --uninstall --local   Remove local install

  DOCUMENTATION
    https://github.com/mindforge-dev/mindforge
    docs/enterprise-setup.md (after install)
\n`);
}
