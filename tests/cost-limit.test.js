/**
 * MindForge v11.9.3 — daily cost cap enforcement (COST-02)
 * Run: node tests/cost-limit.test.js
 *
 * Every case drives the REAL wiring: a MINDFORGE.md on disk, read by
 * bin/models/model-router.js getAllSettings(), consumed by cost-tracker
 * preflight(), and for two cases surfaced through ModelClient.complete().
 * That is deliberate. COST-02 was a two-module NAME mismatch — cost-tracker read
 * `MODEL_COST_HARD_LIMIT_USD` while the registry declares `[COST_HARD_LIMIT_USD]`
 * — so a unit test of either module alone would have passed with the cap inert.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

// Scrub every provider credential BEFORE requiring model-client, so the two
// propagation cases can never reach a network call: with no key set,
// ModelClient._getProvider() returns null for every model in the chain. Each test
// file runs in its own node process (tests/run-all.js), so this cannot leak.
for (const key of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY',
  'OLLAMA_BASE_URL', 'AWS_ACCESS_KEY_ID', 'AWS_PROFILE', 'MINDFORGE_LLM_PROVIDER']) {
  delete process.env[key];
}

const Router = require('../bin/models/model-router');
const CostTracker = require('../bin/models/cost-tracker');
const ModelClient = require('../bin/models/model-client');

const ROOT = process.cwd();
let passed = 0, failed = 0;

async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

/**
 * Run `fn` in a throwaway cwd holding the given MINDFORGE.md lines. Both the
 * router's settings cache and the usage ledger resolve off process.cwd(), so the
 * chdir plus Router.clearCache() is what makes each case independent — without the
 * clearCache the 60s cache at model-router.js:44 would serve the previous fixture.
 */
async function withRegistry(mdLines, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cost-limit-'));
  fs.writeFileSync(path.join(dir, 'MINDFORGE.md'), `${mdLines.join('\n')}\n`);
  process.chdir(dir);
  Router.clearCache();
  try {
    return await fn(dir);
  } finally {
    process.chdir(ROOT);
    Router.clearCache();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Append `usd` to the temp ledger. record() invalidates the 60s spend cache. */
async function spend(usd) {
  await CostTracker.record({
    model: 'claude-haiku-4-5', input_tokens: 1, output_tokens: 1, cost_usd: usd
  });
}

/** Capture stderr for the duration of `fn`. Restored in a finally. */
async function captureStderr(fn) {
  const chunks = [];
  const original = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk) => { chunks.push(String(chunk)); return true; };
  try { await fn(); } finally { process.stderr.write = original; }
  return chunks;
}

const BASE = ['# COST-02 fixture', '[PLANNER] = claude-opus-4-7'];

async function main() {
  console.log('\nCOST-02 — the registry key the user writes is the one that is enforced:');

  await test('the shipped MINDFORGE.md surfaces [COST_HARD_LIMIT_USD] to the router', () => {
    Router.clearCache();
    const settings = Router.getAllSettings();
    assert.strictEqual(settings.COST_HARD_LIMIT_USD, '25.00',
      'MINDFORGE.md must reach getAllSettings() under its registry name');
    assert.strictEqual(settings.MODEL_COST_HARD_LIMIT_USD, undefined,
      'no MINDFORGE.md declares the MODEL_-prefixed name; if this becomes defined ' +
      'the pre-11.9.3 read path was resurrected');
  });

  await test('the shipped registry produces an ARMED $25 cap, not a silent no-op', async () => {
    // The exact v11.9.2 regression: getAllSettings() already had the value and
    // preflight() ignored it. This drives the real registry file end to end.
    const shipped = fs.readFileSync(path.join(ROOT, 'MINDFORGE.md'), 'utf8').split('\n');
    await withRegistry(shipped, async () => {
      await spend(24.99);
      await assert.rejects(() => CostTracker.preflight(0.05),
        (e) => e.code === 'COST_LIMIT_REACHED' && e.limit === 25);
    });
  });

  await test('spend at the cap throws COST_LIMIT_REACHED carrying spend and limit', async () => {
    await withRegistry([...BASE, '[COST_HARD_LIMIT_USD] = 1.00'], async () => {
      await spend(0.99);
      await assert.rejects(() => CostTracker.preflight(0.05),
        (e) => e.code === 'COST_LIMIT_REACHED' && e.limit === 1 && e.spend === 0.99);
    });
  });

  await test('NEGATIVE CONTROL: spend well under the cap does NOT throw', async () => {
    // Without this, a preflight() that threw unconditionally would satisfy every
    // other rejects() case in this file.
    await withRegistry([...BASE, '[COST_HARD_LIMIT_USD] = 25.00'], async () => {
      await spend(0.10);
      assert.strictEqual(await CostTracker.preflight(0.05), undefined);
    });
  });

  await test('NEGATIVE CONTROL: an absent cap fails OPEN, it does not throw', async () => {
    // bin/installer-core.js:706 never rewrites an existing MINDFORGE.md, so an
    // upgraded install has no such key, and .mindforge/MINDFORGE-SCHEMA.json lists
    // it under `recommended` not `required`. Inverting this to fail-closed — as
    // docs/research/2026-08-v12-upgrade-report.md:85 recommends — would refuse
    // every model call on those installs.
    await withRegistry(BASE, async () => {
      await spend(9999);
      assert.strictEqual(await CostTracker.preflight(0.05), undefined);
    });
  });

  await test('an explicit 0 disables the cap', async () => {
    await withRegistry([...BASE, '[COST_HARD_LIMIT_USD] = 0'], async () => {
      await spend(9999);
      assert.strictEqual(await CostTracker.preflight(0.05), undefined);
    });
  });

  await test('an unreadable cap fails CLOSED with COST_LIMIT_MISCONFIGURED', async () => {
    await withRegistry([...BASE, '[COST_HARD_LIMIT_USD] = none'], async () => {
      await assert.rejects(() => CostTracker.preflight(0.05),
        (e) => e.code === 'COST_LIMIT_MISCONFIGURED' && e.key === 'COST_HARD_LIMIT_USD');
    });
  });

  await test('a negative cap fails CLOSED (schema minimum is 0)', async () => {
    await withRegistry([...BASE, '[COST_HARD_LIMIT_USD] = -1'], async () => {
      await assert.rejects(() => CostTracker.preflight(0.05),
        (e) => e.code === 'COST_LIMIT_MISCONFIGURED');
    });
  });

  await test('Infinity is not a cap — it fails CLOSED rather than comparing false forever', async () => {
    await withRegistry([...BASE, '[COST_HARD_LIMIT_USD] = Infinity'], async () => {
      await assert.rejects(() => CostTracker.preflight(0.05),
        (e) => e.code === 'COST_LIMIT_MISCONFIGURED');
    });
  });


  await test('the legacy MODEL_-prefixed key still arms the cap', async () => {
    // .mindforge/MINDFORGE-V2-SCHEMA.json:58 ships that name, so a registry that
    // copied it out has a WORKING cap today. Renaming the read site without this
    // fallback would silently disarm a real spend control.
    await withRegistry([...BASE, '[MODEL_COST_HARD_LIMIT_USD] = 1.00'], async () => {
      await spend(0.99);
      await assert.rejects(() => CostTracker.preflight(0.05),
        (e) => e.code === 'COST_LIMIT_REACHED' && e.limit === 1);
    });
  });

  await test('the canonical key wins when both names are present', async () => {
    await withRegistry([...BASE,
      '[COST_HARD_LIMIT_USD] = 1.00',
      '[MODEL_COST_HARD_LIMIT_USD] = 9999'], async () => {
      await spend(0.99);
      await assert.rejects(() => CostTracker.preflight(0.05),
        (e) => e.code === 'COST_LIMIT_REACHED' && e.limit === 1);
    });
  });

  console.log('\nCOST-02 — the refusal actually reaches the caller:');

  await test('model-client re-throws COST_LIMIT_REACHED', async () => {
    await withRegistry([...BASE, '[COST_HARD_LIMIT_USD] = 1.00'], async () => {
      await spend(0.99);
      await assert.rejects(() => ModelClient.complete({ persona: 'developer', tier: 1 }),
        (e) => e.code === 'COST_LIMIT_REACHED');
    });
  });

  await test('model-client re-throws COST_LIMIT_MISCONFIGURED instead of swallowing it', async () => {
    // The pre-COST-02 catch re-threw only COST_LIMIT_REACHED. If that narrowing
    // comes back, complete() resolves undefined — every provider is null because
    // the credentials were scrubbed above — and this assertion fails with no
    // network call. That is the whole point: the interlock must be observable.
    await withRegistry([...BASE, '[COST_HARD_LIMIT_USD] = none'], async () => {
      await assert.rejects(() => ModelClient.complete({ persona: 'developer', tier: 1 }),
        (e) => e.code === 'COST_LIMIT_MISCONFIGURED');
    });
  });

  console.log('\nCOST-02 — [COST_WARN_USD] soft threshold (had no reader in bin/ before this):');

  await test('crossing the warn threshold writes exactly one stderr line and does not throw', async () => {
    await withRegistry([...BASE, '[COST_WARN_USD] = 0.50', '[COST_HARD_LIMIT_USD] = 25.00'], async () => {
      await spend(0.60);
      const chunks = await captureStderr(async () => {
        assert.strictEqual(await CostTracker.preflight(0.05), undefined);
        assert.strictEqual(await CostTracker.preflight(0.05), undefined);
      });
      const warnings = chunks.filter((l) => l.includes('COST_WARN_USD'));
      assert.strictEqual(warnings.length, 1,
        `expected exactly one warning, got ${warnings.length}: ${JSON.stringify(chunks)}`);
    });
  });

  await test('NEGATIVE CONTROL: below the warn threshold writes nothing', async () => {
    await withRegistry([...BASE, '[COST_WARN_USD] = 5.00', '[COST_HARD_LIMIT_USD] = 25.00'], async () => {
      await spend(0.10);
      const chunks = await captureStderr(() => CostTracker.preflight(0.05));
      assert.deepStrictEqual(chunks.filter((l) => l.includes('COST_WARN_USD')), []);
    });
  });

  await test('the warn threshold fires with NO hard cap set — the upgraded-install case', async () => {
    // Regression guard. The first cut of COST-02 returned on the fail-open path BEFORE
    // warnIfCrossed(), so [COST_WARN_USD] was inert for every install without a hard cap
    // — which, per installer-core.js:706, is the common upgraded install. Both of the
    // original warn tests set a hard cap, so neither could catch it.
    //
    // NOTE the threshold is deliberately unique across this file. cost-tracker.js:113
    // dedups to one warning per (day, threshold value), which is correct production
    // behaviour — a warning that repeats every call is noise. Reusing 0.50 here would be
    // silently suppressed by the earlier 0.50 case and this test would pass for the wrong
    // reason on a green run and fail confusingly on a reorder.
    await withRegistry([...BASE, '[COST_WARN_USD] = 0.51'], async () => {
      await spend(50);
      const chunks = await captureStderr(async () => {
        assert.strictEqual(await CostTracker.preflight(0.05), undefined);
      });
      const warnings = chunks.filter((l) => l.includes('COST_WARN_USD'));
      assert.strictEqual(warnings.length, 1,
        `expected one warning with no hard cap, got ${warnings.length}: ${JSON.stringify(chunks)}`);
    });
  });

  await test('the warn threshold fires when the hard cap is explicitly disabled with 0', async () => {
    // Unique threshold, per the dedup note above.
    await withRegistry([...BASE, '[COST_WARN_USD] = 0.52', '[COST_HARD_LIMIT_USD] = 0'], async () => {
      await spend(50);
      const chunks = await captureStderr(async () => {
        assert.strictEqual(await CostTracker.preflight(0.05), undefined);
      });
      assert.strictEqual(chunks.filter((l) => l.includes('COST_WARN_USD')).length, 1,
        'an explicitly disabled hard cap must not also disable the soft warning');
    });
  });

  console.log(`\n${failed === 0 ? '✅' : '❌'} cost-limit: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
