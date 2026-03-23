#!/usr/bin/env node
/**
 * MindForge v2 — Learn Skill CLI
 * Ingests content from a source and generates a validated SKILL.md.
 */
'use strict';

const Loader    = require('./source-loader');
const Generator = require('./skill-generator');
const Scorer    = require('./skill-scorer');
const Registrar = require('./skill-registrar');

const ARGS = process.argv.slice(2);
const SOURCE = ARGS[0];
const NAME   = ARGS[1] || 'new-skill';

if (!SOURCE) {
  console.log('Usage: node bin/skills-builder/learn-cli.js <source-url-or-path> [skill-name]');
  process.exit(1);
}

async function main() {
  try {
    console.log(`\n📚 Learning skill: ${NAME} from ${SOURCE}`);
    
    // 1. Load
    const { content, metadata } = await Loader.load(SOURCE);
    
    // 2. Generate
    const result = await Generator.generate({
      skillName: NAME,
      content,
      sourceMetadata: metadata,
      sessionId: 'cli-learn'
    });
    
    // 3. Score
    const scoreResult = Scorer.score(result.skillPath);
    console.log(`\n✅ Skill generated: ${result.skillPath}`);
    console.log(`⭐ Quality Score: ${scoreResult.quality_score}/100 (${scoreResult.threshold_status})`);
    
    // 4. Register if acceptable
    if (scoreResult.can_register) {
      Registrar.register(result.skillPath, 'project');
      console.log('📝 Registered in MANIFEST.md');
    } else {
      console.log('⚠️ Score too low for automatic registration.');
      scoreResult.improvement_suggestions.forEach(s => console.log(`  - ${s}`));
    }
    
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
