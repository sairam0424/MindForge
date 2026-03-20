/**
 * MindForge Day 4 — Enterprise Integration Tests
 * Run: node tests/integrations.test.js
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

console.log('\nMindForge Day 4 — Integration Tests\n');

console.log('Scaffold and config:');

[
  '.mindforge/integrations/connection-manager.md',
  '.mindforge/integrations/jira.md',
  '.mindforge/integrations/confluence.md',
  '.mindforge/integrations/slack.md',
  '.mindforge/integrations/github.md',
  '.mindforge/integrations/gitlab.md',
  '.mindforge/org/integrations/INTEGRATIONS-CONFIG.md',
  '.planning/jira-sync.json',
  '.planning/slack-threads.json',
].forEach(file => {
  test(`${file} exists`, () => assert.ok(fs.existsSync(file), `Missing ${file}`));
});

console.log('\nSecurity hardening:');

test('integration config contains no token values', () => {
  const content = read('.mindforge/org/integrations/INTEGRATIONS-CONFIG.md');
  const forbidden = [/ghp_[a-zA-Z0-9]+/, /xoxb-[a-zA-Z0-9-]+/, /sk-[a-zA-Z0-9]+/, /API_TOKEN=\S+/];
  forbidden.forEach(pattern => {
    assert.ok(!pattern.test(content), `Potential token leaked in config: ${pattern}`);
  });
});

test('connection manager documents shell debug prohibition and curl verbose prohibition', () => {
  const content = read('.mindforge/integrations/connection-manager.md');
  assert.ok(content.includes('Debug mode prohibition'), 'Missing debug mode guidance');
  assert.ok(content.includes('curl verbose mode prohibition'), 'Missing curl verbose guidance');
  assert.ok(content.includes('set +x'), 'Missing explicit set +x guidance');
});

test('audit schema and audit command document archive rotation after 10000 lines', () => {
  const schema = read('.mindforge/audit/AUDIT-SCHEMA.md');
  const command = read('.claude/commands/mindforge/audit.md');
  assert.ok(schema.includes('10,000 lines'), 'Missing audit rotation threshold in schema');
  assert.ok(command.includes('10,000 lines'), 'Missing audit rotation threshold in command');
});

console.log('\nJira behaviour:');

test('jira integration uses dynamic transition lookup instead of hardcoded IDs', () => {
  const content = read('.mindforge/integrations/jira.md');
  assert.ok(content.includes('Never hardcode transition IDs'), 'Missing dynamic lookup guidance');
  assert.ok(content.includes('GET /rest/api/3/issue/{issueKey}/transitions'), 'Missing transitions lookup endpoint');
  assert.ok(content.includes('transition_cache'), 'Missing transition cache guidance');
});

test('jira-sync.json includes anti-secret warning', () => {
  const parsed = JSON.parse(read('.planning/jira-sync.json'));
  assert.ok(parsed._warning, 'Missing _warning');
  assert.ok(parsed._warning.toLowerCase().includes('credentials'), 'Warning should mention credentials');
});

test('jira integration documents backoff and second-429 stop behaviour', () => {
  const content = read('.mindforge/integrations/jira.md');
  assert.ok(content.includes('429'), 'Missing rate limit handling');
  assert.ok(content.includes('retry once'), 'Missing retry-once guidance');
});

console.log('\nConfluence and Slack resilience:');

test('confluence integration requires idempotent updates', () => {
  const content = read('.mindforge/integrations/confluence.md');
  assert.ok(content.includes('idempotent'), 'Missing idempotency guidance');
  assert.ok(content.includes('Do not create duplicate pages'), 'Missing duplicate-page guidance');
});

test('slack thread schema is valid and guarded against token storage', () => {
  const parsed = JSON.parse(read('.planning/slack-threads.json'));
  assert.strictEqual(parsed.schema_version, '1.0.0');
  assert.ok(parsed.threads && typeof parsed.threads === 'object', 'Missing threads object');
  assert.ok(parsed._warning.toLowerCase().includes('tokens'), 'Warning should mention tokens');
});

test('slack integration handles invalid thread timestamps and undelivered critical alerts', () => {
  const content = read('.mindforge/integrations/slack.md');
  assert.ok(content.includes('clear that entry'), 'Missing invalid thread handling');
  assert.ok(content.includes('Undelivered alerts'), 'Missing undelivered critical alert handling');
});

console.log('\nGitHub correctness:');

test('github integration treats branch-protection 404 as non-fatal and checks branch diff before PR', () => {
  const content = read('.mindforge/integrations/github.md');
  assert.ok(content.includes('404'), 'Missing branch protection 404 handling');
  assert.ok(content.includes('git log origin/${GITHUB_DEFAULT_BRANCH}..HEAD --oneline | wc -l'), 'Missing ahead-of-base check');
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\n✅ All integration tests passed.\n');
}
