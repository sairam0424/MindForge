'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');
const { calculateSoulScore, parseMetrics } = require('../bin/review/ads-synthesizer');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed += 1;
  }
}

console.log('\nMindForge V3: Adversarial Decision Synthesis (ADS) Tests\n');

// 1. Scoring Logic
test('SOUL Score Calculation: Normal values', () => {
  const metrics = {
    impact: 8,
    leverage: 7,
    reversibility: 5,
    effort: 4,
    risk: 3,
    cost: 2
  };
  const score = calculateSoulScore(metrics);
  // (8 * 7 * 5) / (4 * 3 * 2) = 280 / 24 = 11.666...
  assert.ok(score > 11.6 && score < 11.7, `Expected ~11.6, got ${score}`);
});

test('SOUL Score Calculation: High leverage/impact', () => {
  const metrics = {
    impact: 10,
    leverage: 10,
    reversibility: 10,
    effort: 1,
    risk: 1,
    cost: 1
  };
  const score = calculateSoulScore(metrics);
  assert.strictEqual(score, 1000, 'Score should be 1000 for perfect 10/1 scenario');
});

test('SOUL Score Calculation: Low impact/high cost', () => {
  const metrics = {
    impact: 1,
    leverage: 1,
    reversibility: 1,
    effort: 10,
    risk: 10,
    cost: 10
  };
  const score = calculateSoulScore(metrics);
  assert.strictEqual(score, 0.001, 'Score should be 0.001 for worst-case scenario');
});

// 2. Metrics Parsing
test('Parse Metrics: Standard block', () => {
  const text = `
    Some text before.
    [ADS_METRICS]
    impact: 8
    leverage: 7
    reversibility: 6
    effort: 5
    risk: 4
    cost: 3
    [/ADS_METRICS]
    Some text after.
  `;
  const metrics = parseMetrics(text);
  assert.strictEqual(metrics.impact, 8);
  assert.strictEqual(metrics.leverage, 7);
  assert.strictEqual(metrics.reversibility, 6);
  assert.strictEqual(metrics.effort, 5);
  assert.strictEqual(metrics.risk, 4);
  assert.strictEqual(metrics.cost, 3);
});

test('Parse Metrics: Missing block returns default 5s', () => {
  const metrics = parseMetrics('No metrics here');
  assert.strictEqual(metrics.impact, 5);
  assert.strictEqual(metrics.effort, 5);
});

test('Parse Metrics: Partial block uses defaults', () => {
  const text = `
    [ADS_METRICS]
    impact: 10
    [/ADS_METRICS]
  `;
  const metrics = parseMetrics(text);
  assert.strictEqual(metrics.impact, 10);
  assert.strictEqual(metrics.leverage, 5, 'Should fall back to default');
});

// 3. System Files
test('ADS Protocol file exists', () => {
  assert.ok(fs.existsSync('.mindforge/engine/ads-protocol.md'));
});

test('ADS Synthesizer exists', () => {
  assert.ok(fs.existsSync('bin/review/ads-synthesizer.js'));
});

test('ADS Engine exists', () => {
  assert.ok(fs.existsSync('bin/review/ads-engine.js'));
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
