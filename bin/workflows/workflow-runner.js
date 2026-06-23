'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY_PATH = path.join(ROOT, '.mindforge', 'dynamic-workflows', 'index.json');

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('Workflow registry not found. Run `npx mindforge-cc@latest` to reinstall.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function cmdList() {
  const workflows = loadRegistry();
  const tiers = ['research', 'dev', 'ops', 'intelligence'];
  const byTier = {};
  for (const wf of workflows) {
    (byTier[wf.tier] = byTier[wf.tier] || []).push(wf);
  }

  console.log('\nMindForge Dynamic Workflow Library\n');
  for (const tier of tiers) {
    if (!byTier[tier]) continue;
    console.log(`  ${tier.toUpperCase()} TIER`);
    for (const wf of byTier[tier]) {
      console.log(`    ${wf.command.padEnd(40)} ${wf.description}`);
    }
    console.log('');
  }
  console.log(`  Total: ${workflows.length} workflows`);
  console.log('  Run `node bin/mindforge-cli.js workflow info <name>` for details.\n');
}

function cmdInfo(name) {
  if (!name) {
    console.error('Usage: workflow info <name>');
    process.exit(1);
  }
  const workflows = loadRegistry();
  const wf = workflows.find(w => w.name === name);
  if (!wf) {
    console.error(`Workflow not found: ${name}`);
    console.error(`Available: ${workflows.map(w => w.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${wf.name}`);
  console.log(`  Command:    ${wf.command}`);
  console.log(`  Tier:       ${wf.tier}`);
  console.log(`  Description: ${wf.description}`);
  console.log(`  When to use: ${wf.whenToUse}`);
  console.log(`  Script:     ${wf.scriptPath}`);
  console.log('  Phases:');
  for (const p of wf.phases) {
    console.log(`    ${p.title.padEnd(16)} ${p.detail}`);
  }
  console.log('');
}

function cmdRun(name, args) {
  if (!name) {
    console.error('Usage: workflow run <name> [args...]');
    process.exit(1);
  }
  const workflows = loadRegistry();
  const wf = workflows.find(w => w.name === name);
  if (!wf) {
    console.error(`Workflow not found: ${name}`);
    process.exit(1);
  }

  const scriptPath = path.join(ROOT, wf.scriptPath);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Workflow script not found: ${scriptPath}`);
    process.exit(1);
  }

  const argsStr = args.join(' ');
  console.log(`\nTo run the "${name}" workflow in Claude Code:`);
  console.log('\nInvoke via the Workflow tool with:');
  console.log(`  scriptPath: "${wf.scriptPath}"`);
  console.log(`  args: "${argsStr}"`);
  console.log(`\nOr use the command: ${wf.command} ${argsStr}`);
  console.log('\nThe Workflow tool runs in Claude Code\'s native multi-agent environment.');
  console.log('Phases: ' + wf.phases.map(p => p.title).join(' -> ') + '\n');
}

function run(subcommand, args) {
  switch (subcommand) {
  case 'list':
    cmdList();
    break;
  case 'info':
    cmdInfo(args[0]);
    break;
  case 'run':
    cmdRun(args[0], args.slice(1));
    break;
  default:
    console.error(`Unknown workflow subcommand: ${subcommand || '(none)'}`);
    console.error('Usage: workflow <list|info|run> [args]');
    process.exit(1);
  }
}

module.exports = { run };
