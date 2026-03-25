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
  },

  chars: {
    top: '┌──────────────────────────────────────────────────────────────────────────────┐',
    bottom: '└──────────────────────────────────────────────────────────────────────────────┘',
    side: '│',
    divider: '├──────────────────────────────────────────────────────────────────────────────┤',
    bullet: '◇',
    check: '✔',
    cross: '✘',
    arrow: '→',
    prompt: '❯',
  },

  logo: `
  ███╗   ███╗██╗███╗   ██╗██████╗ ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
  ████╗ ████║██║████╗  ██║██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
  ██╔████╔██║██║██╔██╗ ██║██║  ██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
  ██║╚██╔╝██║██║██║╚██╗██║██║  ██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
  ██║ ╚═╝ ██║██║██║ ╚████║██████╔╝██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
  ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  `.trim(),

  tagline: "THE AUTONOMOUS ENTERPRISE AGENTIC ECOSYSTEM",

  /**
   * Print a styled header
   */
  printHeader(title, subtitle) {
    console.log('\n');
    this.logo.split('\n').forEach(line => {
      console.log(`    ${line}`);
    });
    console.log(`\n  ${this.colors.dim('—'.repeat(74))}`);
    console.log(`\n    ${this.colors.bold(this.tagline)}`);
    console.log(`    ${this.colors.dim(`RELEASE v${subtitle}`)}\n`);
  },

  /**
   * Print a feature grid
   */
  printFeatures() {
    console.log(`  ${this.colors.bold('CORE CAPABILITIES')}`);
    const features = [
      ['6-RUNTIME ORCHESTRATION', 'Unified support for Claude, Gemini, Cursor & more'],
      ['AUTONOMOUS EXECUTION', 'Walk-away autonomy with self-healing capabilities'],
      ['MULTI-MODEL INTELLIGENCE', 'Dynamic routing across Anthropic, OpenAI, and Google'],
      ['ENTERPRISE GOVERNANCE', 'Role-based access and mandatory compliance gates'],
    ];

    features.forEach(([name, desc]) => {
      console.log(`    ${this.colors.cyan('█')} ${this.colors.bold(name.padEnd(28))} ${this.colors.dim(desc)}`);
    });
    console.log('');
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

  printStatus(label, state = 'info') {
    const icons = {
      done: this.colors.green(this.chars.check),
      fail: this.colors.red(this.chars.cross),
      info: this.colors.cyan(this.chars.bullet),
      warn: this.colors.yellow('!'),
    };
    console.log(`  ${icons[state] || icons.info}  ${label}`);
  },

  /**
   * Print a success banner
   */
  printSuccess(runtime, scope) {
    console.log(`\n  ${this.colors.green(this.colors.bold(this.chars.check))} ${this.colors.bold('INSTALLATION COMPLETE')}`);
    console.log(`    MindForge is now active for ${this.colors.cyan(runtime)} (${this.colors.dim(scope)})`);
    
    this.printTryItNow('mindforge-cc init');

    console.log(`  ${this.colors.bold('POST-INSTALL COMMANDS')}`);
    console.log(`    ${this.colors.cyan('1.')} ${this.colors.bold('/mindforge:health')}        ${this.colors.dim('— Verify environment stability')}`);
    console.log(`    ${this.colors.cyan('2.')} ${this.colors.bold('/mindforge:map-codebase')}  ${this.colors.dim('— Contextualize existing repos')}`);
    console.log(`    ${this.colors.cyan('3.')} ${this.colors.bold('/mindforge:ship')}          ${this.colors.dim('— Deploy features with confidence')}\n`);
  }
};

module.exports = Theme;
