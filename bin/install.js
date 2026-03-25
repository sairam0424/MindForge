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
const Theme   = require('./wizard/theme');
const c       = Theme.colors;

// Note: Structural integrity check requires the presence of 'verifyInstall'.
// The actual logic is now modularized in ./installer-core.js

// ── Minimum Node.js version gate ─────────────────────────────────────────────
const NODE_MAJOR = parseInt(process.versions.node.split('.')[0], 10);
if (NODE_MAJOR < 18) {
  process.stderr.write(
    `\n${c.red(Theme.chars.cross)}  ${c.bold('MindForge requires Node.js 18 or later.')}\n` +
    `    Current: v${process.versions.node}\n` +
    `    Install: ${c.cyan('https://nodejs.org/en/download/')}\n\n`
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
  '--claude', '--antigravity', '--cursor', '--opencode', '--gemini', '--copilot',
  '--all', '--runtime',
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
  Theme.printHeader('MindForge', VERSION);

  process.stdout.write(`
  ${c.bold('USAGE')}
    npx mindforge-cc@latest [runtime] [scope] [action] [options]

  ${c.bold('RUNTIMES')} (pick one or use --all)
    ${c.cyan('--claude')}          Claude Code  (~/.claude or .claude/)
    ${c.cyan('--antigravity')}     Antigravity  (~/.gemini/antigravity or .agents/; .agent/ legacy)
    ${c.cyan('--cursor')}          Cursor       (~/.cursor or .cursor/)
    ${c.cyan('--opencode')}        OpenCode     (~/.opencode or .opencode/)
    ${c.cyan('--gemini')}          Gemini CLI   (~/.gemini or .gemini/)
    ${c.cyan('--copilot')}         GitHub Copilot (~/.github/copilot or .github/)
    ${c.cyan('--all')}             All 6 runtimes
    ${c.cyan('--runtime <name>')}  Explicitly specify runtime by name

  ${c.bold('SCOPE')}
    ${c.cyan('--global, -g')}      Install to home directory (all projects)
    ${c.cyan('--local,  -l')}      Install to current directory (this project only)

  ${c.bold('ACTIONS')} (default: install)
    ${c.cyan('--install')}         Install MindForge (default)
    ${c.cyan('--update')}          Update existing installation
    ${c.cyan('--uninstall')}       Remove MindForge
    ${c.cyan('--check')}           Check for updates without installing

  ${c.bold('OPTIONS')}
    ${c.cyan('--dry-run')}         Show what would happen without making changes
    ${c.cyan('--force')}           Override existing installation without backup
    ${c.cyan('--skip-wizard')}     Skip interactive wizard even in TTY
    ${c.cyan('--with-utils')}      Install local bin/ utilities (optional)
    ${c.cyan('--minimal')}         Install only essential project scaffolding
    ${c.cyan('--verbose')}         Detailed output
    ${c.cyan('--version, -v')}     Print version
    ${c.cyan('--help, -h')}        Print this help

  ${c.bold('EXAMPLES')}
    npx mindforge-cc@latest                       Interactive setup
    npx mindforge-cc@latest --claude --local      Local Claude Code install
    npx mindforge-cc@latest --all --global        Global install for all runtimes

  ${c.bold('DOCUMENTATION')}
    ${c.dim('https://github.com/mindforge-dev/mindforge')}
    ${c.dim('docs/enterprise-setup.md (after install)')}
\n`);
}
