'use strict';

const TTY = process.stdout.isTTY;

/**
 * MindForge Theme Utility — "The Digital Architect"
 * Rigid, high-fidelity CLI aesthetic with neon highlights.
 */
const Theme = {
  colors: {
    cyan: (s) => (TTY ? `\x1b[36m${s}\x1b[0m` : s),
    green: (s) => (TTY ? `\x1b[32m${s}\x1b[0m` : s),
    yellow: (s) => (TTY ? `\x1b[33m${s}\x1b[0m` : s),
    red: (s) => (TTY ? `\x1b[31m${s}\x1b[0m` : s),
    dim: (s) => (TTY ? `\x1b[2m${s}\x1b[0m` : s),
    bold: (s) => (TTY ? `\x1b[1m${s}\x1b[0m` : s),
    italic: (s) => (TTY ? `\x1b[3m${s}\x1b[0m` : s),
    magenta: (s) => (TTY ? `\x1b[35m${s}\x1b[0m` : s), // Quantum Security
    orange: (s) => (TTY ? `\x1b[38;5;208m${s}\x1b[0m` : s), // Semantic Homing
  },

  chars: {
    top: '┌──────────────────────────────────────────────────────────────────────────────┐',
    bottom: '└──────────────────────────────────────────────────────────────────────────────┘',
    side: '│',
    divider: '├──────────────────────────────────────────────────────────────────────────────┤',
    bullet: '◇',
    resolved: '●',
    check: '✓',
    cross: '✘',
    arrow: '→',
    prompt: '❯',
  },

  logo: [
    '███╗   ███╗██╗███╗   ██╗██████╗ ███████╗ ██████╗ ██████╗  ██████╗ ███████╗',
    '████╗ ████║██║████╗  ██║██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝',
    '██╔████╔██║██║██╔██╗ ██║██║  ██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ',
    '██║╚██╔╝██║██║██║╚██╗██║██║  ██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ',
    '██║ ╚═╝ ██║██║██║ ╚████║██████╔╝██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗',
    '╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝'
  ].join('\n'),

  tagline: 'THE AUTONOMOUS ENTERPRISE AGENTIC ECOSYSTEM',

  /**
   * Print a styled header with BMad-style border flare
   */
  printHeader(subtitle) {
    console.log(`\n  ${this.colors.dim('┌' + '─'.repeat(78) + '┐')}`);
    this.logo.split('\n').forEach(line => {
      console.log(`  ${this.colors.dim('│')}  ${line.padEnd(74)}  ${this.colors.dim('│')}`);
    });
    console.log(`  ${this.colors.dim('│')}  ${this.colors.bold(this.tagline.padEnd(74))}  ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}  ${this.colors.dim(`RELEASE v${subtitle}`.padEnd(74))}  ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('└' + '─'.repeat(78) + '┘')}\n`);
  },

  /**
   * Print Brand Manifest (BMad V6 style)
   */
  printBrandManifest() {
    console.log(`  ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}  ${this.colors.magenta('🛡️  SOVEREIGN INTELLIGENCE v8.1.1')} — PQAS & Proactive Homing Enabled`);
    console.log(`  ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}  ${this.colors.bold('THE PLATFORM VISION:')}`);
    console.log(`  ${this.colors.dim('│')}    - Unified Enterprise Agentic Ecosystem`);
    console.log(`  ${this.colors.dim('│')}    - Modular Skills & Persona Architecture`);
    // Added Sovereign Intelligence as a core pillar
    console.log(`  ${this.colors.dim('│')}    - ${this.colors.magenta('Sovereign Intelligence')}: PQ-Safe & Proactive Swarms`);
    console.log(`  ${this.colors.dim('│')}    - Autonomous Governance & Self-Healing`);
    console.log(`  ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}  ${this.colors.yellow('🌟 100% FREE & OPEN SOURCE')}`);
    console.log(`  ${this.colors.dim('│')}    - No paywalls. No gated content.`);
    console.log(`  ${this.colors.dim('│')}    - Empowering everyone with AI-Native tools.`);
    console.log(`  ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}  ${this.colors.cyan('⭐ HELP US GROW:')}`);
    console.log(`  ${this.colors.dim('│')}    - GitHub:  ${this.colors.dim('https://github.com/sairam0424/MindForge')}`);
    console.log(`  ${this.colors.dim('│')}    - Discord: ${this.colors.dim('https://discord.gg/mindforge')}`);
    console.log(`  ${this.colors.dim('│')}    - Docs:    ${this.colors.dim('https://docs.mindforge.cc')}`);
    console.log(`  ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('—'.repeat(80))}\n`);
  },

  printPrompt(label) {
    console.log(`  ${this.colors.cyan(this.chars.bullet)}  ${label}`);
  },

  printResolved(label) {
    console.log(`  ${this.colors.green(this.chars.resolved)}  ${label}`);
  },

  /**
   * Success Banner (  V2 Architectural Style)
   */
  printSuccessV2(runtime, scope, stats = {}) {
    const { personas = 117, skills = 20, governance = 4, integrations = 7 } = stats;
    const boxWidth = 72;

    console.log(`\n  ${this.colors.green('MINDFORGE is ready! ')} ${this.colors.dim('─'.repeat(boxWidth - 20))}╮`);
    console.log(`  ${this.colors.dim('│')}                                                                        ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}    ${this.colors.green('✓')}  ${this.colors.bold('MindForge Core')} (installed)                             ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}    ${this.colors.green('✓')}  ${this.colors.bold('Personas')}     (${personas} active)                            ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}    ${this.colors.green('✓')}  ${this.colors.bold('Skill Packs')}  (${skills} verified)                          ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}                                                                        ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}    ${this.colors.bold('Environment')}: ${this.colors.cyan(runtime)} (${this.colors.dim(scope)})                         ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}                                                                        ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}    ${this.colors.bold('Next steps:')}                                                   ${this.colors.dim('│')}`);
    // Was `mindforge-cc init`, which does not exist. mindforge-cc takes flags only and silently
    // ignored the positional, so obeying this line re-ran the installer against whatever directory
    // the user was standing in: measured 1,836 files written into an empty temp dir, exit 0, and
    // this same panel printed again — so it loops. `/mindforge:init-project` is the real command and
    // the install has just placed it in the harness, so the instruction now names something the
    // user actually has. bin/install.js rejects stray positionals too: a wrong instruction and a
    // silent acceptance of it are two separate defects, and fixing either alone leaves a trap.
    // Padding keeps the visible width at 65 so the box border still lines up.
    console.log(`  ${this.colors.dim('│')}      ${this.colors.bold('/mindforge:init-project')}  ${this.colors.dim('— Initialize your workspace')}       ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}      ${this.colors.bold('/mindforge:help')}    ${this.colors.dim('— Explore the command suite')}        ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('│')}                                                                        ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('├' + '─'.repeat(boxWidth) + '╯')}\n`);

    this.printManifest(stats);
  },

  /**
   * Legacy printSuccess (Redirects to V2)
   */
  printSuccess(runtime, scope, stats = {}) {
    this.printSuccessV2(runtime, scope, stats);
  },

  /**
   * Print Manifest (Hardened for V2)
   */
  printManifest(stats = {}) {
    const { personas = 117, skills = 20, subagents = 154, governance = 4, integrations = 7, actions = 71, docs = 12, templates = 21 } = stats;

    console.log(`  ${this.colors.bold('PAYLOAD MANIFEST')}`);
    console.log(`  ${this.colors.dim('┌' + '─'.repeat(74) + '┐')}`);

    const rows = [
      ['PERSONAS', personas, 'The autonomous persona ecosystem'],
      ['SKILLS', skills, 'Enterprise-grade skill packs'],
      ['SUBAGENTS', subagents, 'Specialized Claude Code subagents'],
      ['GOVERNANCE', governance, 'Compliance and safety modules'],
      ['INTEGRATIONS', integrations, 'Multi-platform connector suite'],
      ['REFERENCES', docs, 'Standardized architecture references'],
      ['TEMPLATES', templates, 'Engineering and planning templates'],
      ['ACTIONS', actions, 'Total autonomous commands deployed'],
    ];

    rows.forEach(([label, count, desc]) => {
      const countStr = count.toString().padStart(3);
      console.log(`  ${this.colors.dim('│')}  ${this.colors.cyan('█')} ${this.colors.bold(label.padEnd(14))} ${this.colors.cyan(countStr)}   ${this.colors.dim(desc.padEnd(48))} ${this.colors.dim('│')}`);
    });

    console.log(`  ${this.colors.dim('└' + '─'.repeat(74) + '┘')}\n`);
  },

  /**
   * Print a status line
   */
  printTryItNow(command) {
    const termWidth = process.stdout.columns || 80;
    const padding = 4;
    const content = `$ ${command}`;
    const boxWidth = Math.min(termWidth - 4, content.length + padding * 2);
    
    console.log(`\n  ${this.colors.bold('TRY IT NOW')}`);
    console.log(`  ${this.colors.dim('┌' + '─'.repeat(boxWidth - 2) + '┐')}`);
    console.log(`  ${this.colors.dim('│')}  ${this.colors.cyan(content.padEnd(boxWidth - 4))}  ${this.colors.dim('│')}`);
    console.log(`  ${this.colors.dim('└' + '─'.repeat(boxWidth - 2) + '┘')}\n`);
  },

  /**
   * Print a status line
   */
  printStatus(label, state = 'info') {
    const icons = {
      done: this.colors.green(this.chars.resolved),
      fail: this.colors.red(this.chars.cross),
      info: this.colors.cyan(this.chars.bullet),
      warn: this.colors.yellow('!'),
    };
    console.log(`  ${icons[state] || icons.info}  ${label}`);
  },

  // --- Aliases for legacy compatibility ---
  status(label, state) { this.printStatus(label, state); }
};

module.exports = Theme;
