#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);

const targets = {
  claude: '.claude',
  antigravity: '.agent',
};

const runtime = args.find(a => targets[a]) || 'claude';
const scope = args.includes('--global') ? 'global' : 'local';

console.log(`\n⚡ FORGE Framework Installer`);
console.log(`Runtime: ${runtime} | Scope: ${scope}\n`);

// TODO: copy .forge/ and commands to target directory
console.log('Installer scaffolded. Full implementation coming in Phase 2.');
