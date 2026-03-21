#!/usr/bin/env node

'use strict';

const readline = require('readline');
const detector = require('./environment-detector');
const generator = require('./config-generator');

const VERSION = require('../../package.json').version;
const ARGS = process.argv.slice(2);
const IS_INTERACTIVE =
  !ARGS.some((a) => ['--claude', '--antigravity', '--all', '--help'].includes(a)) &&
  process.stdin.isTTY !== false;

const TTY = process.stdout.isTTY;
const c = {
  bold: (s) => (TTY ? `\x1b[1m${s}\x1b[0m` : s),
  cyan: (s) => (TTY ? `\x1b[36m${s}\x1b[0m` : s),
  green: (s) => (TTY ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (TTY ? `\x1b[33m${s}\x1b[0m` : s),
  red: (s) => (TTY ? `\x1b[31m${s}\x1b[0m` : s),
  dim: (s) => (TTY ? `\x1b[2m${s}\x1b[0m` : s),
};

function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: TTY,
  });
}

function ask(rl, q, def) {
  return new Promise((resolve) => {
    const prompt = def ? `${q} ${c.dim(`[${def}]`)}: ` : `${q}: `;
    rl.question(prompt, (answer) => resolve(answer.trim() || def || ''));
  });
}

function askChoice(rl, q, choices, defaultIdx = 0) {
  console.log(`\n${q}`);
  choices.forEach((choice, i) => console.log(`  ${i + 1}) ${choice}`));
  return new Promise((resolve) => {
    rl.question(`Choice [${defaultIdx + 1}]: `, (answer) => {
      const idx = Number.parseInt(answer.trim(), 10) - 1;
      resolve(choices[Number.isInteger(idx) && idx >= 0 && idx < choices.length ? idx : defaultIdx]);
    });
  });
}

function askMultiChoice(rl, q, choices) {
  console.log(`\n${q}`);
  choices.forEach((choice, i) => console.log(`  ${i + 1}) ${choice}`));
  return new Promise((resolve) => {
    rl.question('Select (comma-separated): ', (answer) => {
      const selected = answer
        .split(',')
        .map((s) => Number.parseInt(s.trim(), 10) - 1)
        .filter((i) => Number.isInteger(i) && i >= 0 && i < choices.length)
        .map((i) => choices[i]);
      resolve(selected.length ? selected : [choices[0]]);
    });
  });
}

function printBanner() {
  console.log('');
  console.log(c.bold(c.cyan('  MindForge Setup Wizard')));
  console.log(c.dim(`  v${VERSION}`));
  console.log('');
}

async function detectEnvironment() {
  console.log(c.bold('  Detecting environment...\n'));
  const env = await detector.detect();
  const rows = [
    ['Runtime(s)', env.runtimes.join(', ') || 'none'],
    ['Git repo', env.hasGit ? 'yes' : 'no'],
    ['Node.js', env.nodeVersion],
    ['Project type', env.projectType],
    ['Package manager', env.packageManager],
    ['Existing MindForge', env.existingInstall ? `yes (${env.existingVersion})` : 'no'],
  ];
  rows.forEach(([k, v]) => console.log(`  ${c.dim(k.padEnd(20))} ${v}`));
  console.log('');
  return env;
}

async function selectRuntime(rl, detected) {
  const choices = ['Claude Code', 'Antigravity', 'Both'];
  const pick = await askChoice(rl, 'Install runtime:', choices, detected.includes('claude') ? 0 : 2);
  if (pick === 'Claude Code') return ['claude'];
  if (pick === 'Antigravity') return ['antigravity'];
  return ['claude', 'antigravity'];
}

async function selectScope(rl) {
  const pick = await askChoice(rl, 'Install scope:', ['Global', 'Local'], 0);
  return pick.toLowerCase();
}

async function configureFeatures(rl) {
  const features = await askMultiChoice(rl, 'Configure optional integrations:', [
    'Jira integration',
    'Slack notifications',
    'GitHub integration',
    'None',
  ]);

  const config = {};
  const credGuidance = [];

  if (features.includes('Jira integration')) {
    config.jira = {
      baseUrl: await ask(rl, '  Jira base URL', 'https://your-org.atlassian.net'),
      projectKey: await ask(rl, '  Jira project key', 'ENG'),
    };
    credGuidance.push({
      service: 'Jira / Confluence (Atlassian)',
      envVar: 'JIRA_API_TOKEN',
      url: 'https://id.atlassian.com/manage-profile/security/api-tokens',
      instruction: 'Create token and export JIRA_API_TOKEN',
    });
  }

  if (features.includes('Slack notifications')) {
    config.slack = { channelId: await ask(rl, '  Slack channel ID', 'C01234ABCDE') };
    credGuidance.push({
      service: 'Slack',
      envVar: 'SLACK_BOT_TOKEN',
      url: 'https://api.slack.com/apps',
      instruction: 'Create bot token and export SLACK_BOT_TOKEN',
    });
  }

  if (features.includes('GitHub integration')) {
    config.github = {
      repo: await ask(rl, '  GitHub repo (owner/name)', ''),
      reviewers: await ask(rl, '  Default reviewers', ''),
    };
    credGuidance.push({
      service: 'GitHub',
      envVar: 'GITHUB_TOKEN',
      url: 'https://github.com/settings/tokens',
      instruction: 'Create PAT and export GITHUB_TOKEN',
    });
  }

  return { config, credGuidance };
}

async function install(runtimes, scope) {
  const installer = require('../install');
  if (!installer || typeof installer.install !== 'function') return;
  for (const runtime of runtimes) {
    await installer.install(runtime, scope);
  }
}

function printNextSteps(runtimes, scope, credGuidance = []) {
  console.log('');
  console.log(c.bold(c.green('  Setup complete')));
  console.log(`  Runtime: ${runtimes.join(', ')}`);
  console.log(`  Scope: ${scope}`);
  console.log('  Next: run /mindforge:health');

  if (credGuidance.length > 0) {
    console.log(c.bold('\n  Configure credentials:\n'));
    credGuidance.forEach((g) => {
      console.log(`  ${c.cyan(g.service)}`);
      console.log(`    ${g.instruction} (${g.envVar})`);
      console.log(c.dim(`    Docs: ${g.url}\n`));
    });
  }
}

function handleWizardError(err) {
  console.error(c.red('\n  Setup encountered an issue:\n'));

  const COMMON_ERRORS = {
    ENOENT: {
      message: 'A required file was not found.',
      action: 'Run from project root and verify install artifacts exist.',
    },
    EACCES: {
      message: 'Permission denied writing to target path.',
      action: 'Adjust permissions or run with appropriate access.',
    },
    MODULE_NOT_FOUND: {
      message: 'Installer module is missing.',
      action: 'Reinstall package and retry.',
    },
    ERR_INVALID_ARG_TYPE: {
      message: 'Unexpected argument type while running setup.',
      action: 'Run non-interactive mode as fallback.',
    },
  };

  const known = COMMON_ERRORS[err.code] || COMMON_ERRORS.ERR_INVALID_ARG_TYPE;
  console.error(`  Problem: ${known.message}`);
  console.error(`  Action:  ${known.action}`);
  console.error(c.dim('\n  Fallback examples:'));
  console.error(c.dim('  npx mindforge-cc --claude --local'));
  console.error(c.dim('  npx mindforge-cc --antigravity --local'));
  console.error(c.dim('  npx mindforge-cc --all --global\n'));
}

async function main() {
  printBanner();

  if (!IS_INTERACTIVE) {
    const installer = require('../install');
    if (installer && typeof installer.runCli === 'function') {
      installer.runCli();
    }
    return;
  }

  const rl = createReadline();
  try {
    const env = await detectEnvironment();
    const runtimes = await selectRuntime(rl, env.runtimes);
    const scope = await selectScope(rl);
    const { config, credGuidance } = await configureFeatures(rl);
    rl.close();

    await install(runtimes, scope);
    await generator.writeIntegrationsConfig(config);
    printNextSteps(runtimes, scope, credGuidance);
  } catch (err) {
    rl.close();
    handleWizardError(err);
    process.exit(1);
  }
}

main();
