#!/usr/bin/env node
/**
 * MindForge v2 — /mindforge:remember CLI
 */
'use strict';

const Store   = require('./knowledge-store');
const Indexer = require('./knowledge-indexer');
const Sync    = require('./global-sync');

const args = process.argv.slice(2);
const help = `
Usage: /mindforge:remember [options]

Options:
  --add "content"     Add a new domain knowledge entry
  --topic "title"     Set topic for the new entry
  --tags "t1,t2"      Set tags for the new entry
  --type "type"       Set type (default: domain_knowledge)
  --search "query"    Search the knowledge base
  --list [type]       List recent entries (optional filter by type)
  --stats             Show memory statistics
  --promote "id"      Promote an entry to the global knowledge base
  --global            Include global entries in search/list
  --help              Show this help
`;

async function run() {
  if (args.includes('--help') || args.length === 0) {
    console.log(help);
    return;
  }

  if (args.includes('--stats')) {
    console.log('\n--- Project Memory Statistics ---');
    console.log(JSON.stringify(Store.stats(), null, 2));
    console.log('\n--- Global Memory Statistics ---');
    console.log(JSON.stringify(Sync.globalStats(), null, 2));
    return;
  }

  if (args.includes('--add')) {
    const content = args[args.indexOf('--add') + 1];
    const topic   = args[args.indexOf('--topic') + 1] || content.slice(0, 50);
    const tags    = (args[args.indexOf('--tags') + 1] || '').split(',').filter(Boolean);
    const type    = args[args.indexOf('--type') + 1] || 'domain_knowledge';

    const id = Store.add({ type, topic, content, tags, source: 'manual-cli' });
    console.log(`✅ Remembered! Entry added with ID: ${id}`);
    return;
  }

  if (args.includes('--search')) {
    const query = args[args.indexOf('--search') + 1];
    const includeGlobal = args.includes('--global');
    const results = Indexer.search(query, { includeGlobal });

    if (results.length === 0) {
      console.log('No matching memories found.');
    } else {
      console.log(`\nFound ${results.length} relevant memories:`);
      results.forEach((e, i) => {
        const globalMarker = e.global ? '[GLOBAL] ' : '';
        console.log(`${i+1}. ${globalMarker}${e.topic} (${(e.confidence * 100).toFixed(0)}% confidence)`);
        console.log(`   ID: ${e.id}`);
        console.log(`   ${e.content.slice(0, 100)}...`);
        console.log();
      });
    }
    return;
  }

  if (args.includes('--list')) {
    const type = args[args.indexOf('--list') + 1];
    const entries = type ? Store.readByType(type) : Store.readAll(args.includes('--global'));
    
    console.log('\nShowing last 10 entries:');
    entries.slice(-10).reverse().forEach((e, i) => {
      console.log(`${i+1}. [${e.type}] ${e.topic} (${e.id})`);
    });
    return;
  }

  if (args.includes('--promote')) {
    const id = args[args.indexOf('--promote') + 1];
    try {
      const result = Sync.promote(id);
      console.log(`✅ Promoted! Entry ${id} is now in your global knowledge base.`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
    return;
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
