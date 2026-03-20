/**
 * MindForge Day 4 — Governance Tests
 * Run: node tests/governance.test.js
 */

const fs = require('fs');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function classifyChange({ files, diff, recentHighSeverityFinding = false }) {
  const fileSignals = /(auth\/|security\/|payment\/|billing\/|privacy\/|crypto\/|secrets\/|login\.ts|logout\.ts|token\.ts|password\.ts|credentials\.ts|session\.ts|oauth\.ts|jwt\.ts|hash\.ts|encrypt\.ts|stripe\.ts|payment\.ts|billing\.ts|pii\.ts|consent\.ts)/;
  const codeSignals = /(bcrypt|argon2|jwt\.sign|jwt\.verify|jose\.sign|jose\.verify|stripe\.|paypal\.|createCipheriv|createDecipheriv|crypto\.subtle|hashPassword|verifyPassword|encrypt\(|decrypt\(|role.*permission|hasPermission|SET ROLE|GRANT)/;

  if (files.some(file => fileSignals.test(file))) return 3;
  if (codeSignals.test(diff)) return 3;
  if (recentHighSeverityFinding) return 3;
  if (files.length > 10) return 2;
  return 1;
}

console.log('\nMindForge Day 4 — Governance Tests\n');

console.log('Governance files:');

[
  '.mindforge/governance/change-classifier.md',
  '.mindforge/governance/approval-workflow.md',
  '.mindforge/governance/compliance-gates.md',
  '.mindforge/governance/GOVERNANCE-CONFIG.md',
  '.mindforge/team/multi-handoff.md',
  '.mindforge/team/session-merger.md',
  'docs/governance-guide.md',
].forEach(file => {
  test(`${file} exists`, () => assert.ok(fs.existsSync(file), `Missing ${file}`));
});

console.log('\nClassifier hardening:');

test('tier 3 triggers on code pattern even in helper.ts', () => {
  const tier = classifyChange({
    files: ['src/utils/helper.ts'],
    diff: '+ const token = jwt.sign(payload, secret);',
  });
  assert.strictEqual(tier, 3);
});

test('tier 3 triggers on audit-history escalation', () => {
  const tier = classifyChange({
    files: ['src/utils/helpers.ts'],
    diff: '+ export const noop = true;',
    recentHighSeverityFinding: true,
  });
  assert.strictEqual(tier, 3);
});

test('change classifier documents trigger points and code-content scanning', () => {
  const content = read('.mindforge/governance/change-classifier.md');
  assert.ok(content.includes('Before each plan executes'), 'Missing plan execution trigger');
  assert.ok(content.includes('Code content patterns'), 'Missing code-content scanning section');
  assert.ok(content.includes('jwt.sign'), 'Missing concrete Tier 3 code pattern');
});

console.log('\nApproval workflow and emergency handling:');

test('approval workflow documents pending-only listing and rejection context carry-forward', () => {
  const approve = read('.claude/commands/mindforge/approve.md');
  const workflow = read('.mindforge/governance/approval-workflow.md');
  assert.ok(approve.includes('status: pending'), 'Missing pending-only listing rule');
  assert.ok(workflow.includes('rejection reason'), 'Missing rejection-reason carry-forward');
});

test('approve command requires explicit emergency flag and EMERGENCY_APPROVERS config', () => {
  const approve = read('.claude/commands/mindforge/approve.md');
  const config = read('.mindforge/org/integrations/INTEGRATIONS-CONFIG.md');
  assert.ok(approve.includes('--emergency'), 'Missing emergency flag requirement');
  assert.ok(config.includes('EMERGENCY_APPROVERS='), 'Missing EMERGENCY_APPROVERS');
});

test('approval workflow documents identity assurance limitation', () => {
  const content = read('.mindforge/governance/approval-workflow.md');
  assert.ok(content.includes('spoofable'), 'Missing identity limitation acknowledgement');
  assert.ok(content.includes('IdP'), 'Missing stronger identity recommendation');
});

console.log('\nCompliance and team coordination:');

test('gdpr gate runs independently of skill loading and checks retention policy', () => {
  const content = read('.mindforge/governance/compliance-gates.md');
  assert.ok(content.includes('independently of skill loading'), 'Missing skill-independent gate');
  assert.ok(content.includes('retention'), 'Missing retention requirement');
});

test('multi-developer handoff documents stale detection after 4 hours', () => {
  const content = read('.mindforge/team/multi-handoff.md');
  assert.ok(content.includes('older than 4 hours'), 'Missing stale detection threshold');
});

test('session merger requires AUDIT entries to be committed with task commits', () => {
  const content = read('.mindforge/team/session-merger.md');
  assert.ok(content.includes('AUDIT'), 'Missing AUDIT merge guidance');
  assert.ok(content.includes('committed'), 'Missing committed AUDIT guidance');
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\n✅ All governance tests passed.\n');
}
