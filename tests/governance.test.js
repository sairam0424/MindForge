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

// These two tests used to call a classifyChange() defined at the top of THIS FILE — a complete
// re-implementation of the classifier, with its own file and code regexes. They asserted that the
// local copy behaved, never that bin/change-classifier.js did. Measured: replacing the real
// classifier's whole pattern loop with `for (const pattern of [])` left this suite green and
// tests/change-classifier.test.js at 14/14. One of the two tests asserted audit-history escalation
// that the real classifier has never implemented at all.
//
// Tier behaviour is now driven end-to-end against the real module, through real git repos, in
// tests/change-classifier.test.js. What belongs HERE is the governance concern: does the
// governance DOC describe what the code actually does?

test('this suite does not re-implement the classifier it is meant to guard', () => {
  // The defect above, pinned so it cannot come back. A local re-implementation always passes,
  // because it is written from the same doc the assertions were written from.
  const self = read(__filename);
  const code = self.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/function\s+classifyChange\b/.test(code),
    'governance.test.js must not define its own classifyChange — require bin/change-classifier.js ' +
    'or assert on the doc, never on a copy of the logic');
});

test('Signal C is documented as unimplemented, because it is', () => {
  // The doc specified Signal C (audit-history escalation) in the imperative, and listed
  // "audit_history" in signals_checked, while bin/change-classifier.js has no such signal. It
  // cannot be implemented as specified: .planning/AUDIT.jsonl is gitignored, untracked and not in
  // package.json files[], so it is absent from the clone the classifier runs in.
  const classifier = read('bin/change-classifier.js');
  const doc = read('.mindforge/governance/change-classifier.md');
  const implemented = /security_finding|audit_history|AUDIT\.jsonl/.test(classifier);

  if (implemented) {
    assert.ok(!/SPECIFIED, NOT IMPLEMENTED/.test(doc),
      'Signal C now appears in bin/change-classifier.js — remove the "NOT IMPLEMENTED" marker ' +
      'from change-classifier.md and add a behavioural test for it');
  } else {
    assert.match(doc, /### Signal C[^\n]*SPECIFIED, NOT IMPLEMENTED/,
      'Signal C is absent from the classifier, so the doc must say so rather than describing it ' +
      'as a live protection');
    assert.ok(!/"audit_history"/.test(doc),
      'the audit-entry example must not list audit_history in signals_checked while no code ' +
      'checks it — that is a claim of coverage the classifier does not provide');
  }
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
