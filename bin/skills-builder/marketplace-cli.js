#!/usr/bin/env node
/**
 * MindForge v2 — Marketplace CLI
 * Searched and manages community skills via npm registry.
 */
'use strict';

const Marketplace = require('./marketplace-client');

const ARGS = process.argv.slice(2);
const CMD  = ARGS[0];
const QUERY = ARGS[1];

if (!CMD) {
  console.log('Usage: node bin/skills-builder/marketplace-cli.js <search|featured|trending|install> [query]');
  process.exit(1);
}

async function main() {
  try {
    switch (CMD) {
      case 'search':
        const results = await Marketplace.search(QUERY);
        console.table(results.map(r => ({
          name: r.name,
          version: r.version,
          score: r.quality?.score || 'N/A',
          description: r.description.slice(0, 50) + '...'
        })));
        break;
        
      case 'featured':
      case 'trending':
        const list = await Marketplace.getFeatured();
        console.table(list);
        break;
        
      case 'install':
        if (!QUERY) throw new Error('Package name required for install');
        await Marketplace.install(QUERY);
        console.log(`✅ Successfully installed ${QUERY}`);
        break;

      default:
        console.error(`Unknown command: ${CMD}`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
