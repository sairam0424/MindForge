#!/usr/bin/env node

/**
 * MindForge Shard Helper
 * Automates SRD scoring and Semantic Retrieval for Tri-Tier Memory.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const command = args[0];

// ── SRD Scoring Logic ────────────────────────────────────────────────────────

function calculateSRD(item, recentReferences = []) {
  // D (Decisiveness): 1.0 for terminal decisions, 0.5 for discoveries
  let D = 0.5;
  if (item.type === 'architectural_decision' || item.id && item.id.startsWith('ADR-')) D = 1.0;
  
  // F (Frequency): Normalized count of references
  const refCount = recentReferences.filter(r => r === item.id || r === item.topic).length;
  let F = Math.min(1.0, refCount / 5);

  // I (Impact): Qualitative weight
  let I = 0.5;
  const highImpactKeywords = ['security', 'auth', 'database', 'kafka', 'core', 'protocol'];
  const text = (item.content || '' + item.topic || '').toLowerCase();
  if (highImpactKeywords.some(k => text.includes(k))) I = 1.0;
  if (text.includes('typo') || text.includes('comment') || text.includes('housekeeping')) I = 0.1;

  return (D * 0.6) + (F * 0.1) + (I * 0.3);
}

// ── Semantic Retrieval Logic ──────────────────────────────────────────────────

function getRelevanceScore(query, text) {
  const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const targetText = text.toLowerCase();
  let score = 0;
  
  queryWords.forEach(word => {
    if (targetText.includes(word)) score += 1;
  });
  
  return score;
}

// ── CLI Handlers ─────────────────────────────────────────────────────────────

if (command === '--analyse') {
  const inputFile = args[1] || '.planning/HANDOFF.json';
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: ${inputFile} not found.`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const items = data.hot_context ? 
    [...(data.hot_context.active_decisions || []), ...(data.hot_context.recent_discoveries || [])] :
    [];

  const scored = items.map(item => {
    const score = calculateSRD(item);
    const content = JSON.stringify(item);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    
    return {
      ...item,
      srd: score,
      checksum,
      tags: [...(item.tags || []), ...(item.topic ? item.topic.toLowerCase().split(' ') : [])]
    };
  }).sort((a, b) => b.srd - a.srd);

  console.log(JSON.stringify(scored, null, 2));
} 

else if (command === '--verify') {
  const shardPath = args[1];
  const lines = fs.readFileSync(shardPath, 'utf8').split('\n').filter(l => l.trim());
  let issues = [];

  lines.forEach((line, idx) => {
    const item = JSON.parse(line);
    const storedChecksum = item.checksum;
    delete item.checksum;
    delete item.srd;
    delete item.tags;
    
    const currentChecksum = crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex');
    if (storedChecksum !== currentChecksum) {
      issues.push(`Line ${idx + 1}: Checksum mismatch!`);
    }
  });

  if (issues.length > 0) {
    console.error(`Verification FAILED:\n${issues.join('\n')}`);
    process.exit(1);
  }
  console.log('Shard integrity verified.');
}

else if (command === '--retrieve') {
  const query = args[1];
  const shardDir = '.planning/memories/';
  
  if (!fs.existsSync(shardDir)) {
    console.log('[]');
    process.exit(0);
  }

  const shards = fs.readdirSync(shardDir).filter(f => f.endsWith('.jsonl'));
  let results = [];

  shards.forEach(shard => {
    const lines = fs.readFileSync(path.join(shardDir, shard), 'utf8').split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const item = JSON.parse(line);
      const score = getRelevanceScore(query, (item.content || '') + ' ' + (item.topic || ''));
      if (score > 0) {
        results.push({ ...item, retrieval_score: score });
      }
    });
  });

  results.sort((a, b) => b.retrieval_score - a.retrieval_score);
  console.log(JSON.stringify(results.slice(0, 3), null, 2));
}

else {
  console.log('Usage: shard-helper --analyse [file] | --retrieve "[query]"');
}
