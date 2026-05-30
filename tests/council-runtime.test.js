'use strict';
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
let passed = 0, failed = 0; const tests = [];
function test(name, fn){ tests.push({name,fn}); }

test('runCouncil collects a position per voice and returns verdict + consensus + dissent', async () => {
  const { runCouncil } = require('../bin/engine/council-runtime');
  const mockModel = async ({ voice }) => {
    const approve = (voice === 'architect' || voice === 'pragmatist');
    return { recommendation: approve ? 'PROCEED' : 'REVISE', confidence: approve ? 0.9 : 0.4,
             rationale: `${voice} says ${approve ? 'go' : 'wait'}` };
  };
  const result = await runCouncil('Adopt approach X?', {
    voices: ['architect', 'skeptic', 'pragmatist', 'critic'],
    consensusThreshold: 0.75, model: mockModel, writeDecision: false,
  });
  assert.strictEqual(result.positions.length, 4, 'one position per voice');
  assert.ok(typeof result.consensus === 'number', 'consensus score present');
  assert.ok(Array.isArray(result.dissent), 'dissent list present');
  assert.ok(result.dissent.length >= 1, 'skeptic/critic dissent captured');
  assert.ok(['PROCEED', 'REVISE', 'NO_CONSENSUS'].includes(result.verdict), 'verdict in enum');
});

test('runCouncil reaches PROCEED when all voices strongly approve', async () => {
  const { runCouncil } = require('../bin/engine/council-runtime');
  const allApprove = async ({ voice }) => ({ recommendation: 'PROCEED', confidence: 0.9, rationale: `${voice} go` });
  const r = await runCouncil('Q?', { voices: ['architect','skeptic','pragmatist','critic'], consensusThreshold: 0.75, model: allApprove, writeDecision: false });
  assert.strictEqual(r.verdict, 'PROCEED');
  assert.strictEqual(r.dissent.length, 0, 'no dissent when unanimous');
});

test('runCouncil writes a decision record when writeDecision + decisionId given', async () => {
  const { runCouncil } = require('../bin/engine/council-runtime');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-council-'));
  try {
    const m = async ({ voice }) => ({ recommendation: 'PROCEED', confidence: 0.8, rationale: voice });
    await runCouncil('Q?', { voices: ['architect','skeptic'], consensusThreshold: 0.75, model: m,
      writeDecision: true, outputPath: tmp, decisionId: 'test123' });
    const file = path.join(tmp, 'council-test123.json');
    assert.ok(fs.existsSync(file), 'decision record written');
    const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.strictEqual(rec.question, 'Q?');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('runCouncil throws if no model function injected', async () => {
  const { runCouncil } = require('../bin/engine/council-runtime');
  await assert.rejects(() => runCouncil('Q?', { voices: ['architect'] }), /model/i);
});

(async () => {
  for (const {name,fn} of tests){ try{ await fn(); console.log(`  ✅  ${name}`); passed++; }catch(e){ console.error(`  ❌  ${name}\n      ${e.message}`); failed++; } }
  console.log(`\nCouncil Runtime: ${passed} passed, ${failed} failed`);
  if (failed>0) process.exit(1);
})();
