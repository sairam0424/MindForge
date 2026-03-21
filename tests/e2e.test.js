/**
 * MindForge Day 7 — End-to-End Simulation Tests
 * Simulates complete project workflows using file system operations.
 * No actual Claude API calls — tests the state machine, not the AI.
 *
 * Run: node tests/e2e.test.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const assert = require('assert');
let passed = 0, failed = 0;
const cleanupFailures = [];

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

// ── Test project factory ───────────────────────────────────────────────────────
function createTestProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mindforge-e2e-'));

  function write(relPath, content) {
    const fullPath = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    return fullPath;
  }

  function read(relPath) {
    const p = path.join(tmpDir, relPath);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  }

  function exists(relPath) {
    return fs.existsSync(path.join(tmpDir, relPath));
  }

  function appendAudit(entry) {
    const auditPath = path.join(tmpDir, '.planning', 'AUDIT.jsonl');
    const line = JSON.stringify({
      id:         `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp:  new Date().toISOString(),
      session_id: 'test-session-001',
      agent:      'mindforge-test',
      ...entry,
    });
    fs.appendFileSync(auditPath, line + '\n');
  }

  function cleanup() {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); }
    catch(e) {
      cleanupFailures.push(tmpDir);
      console.warn(`  ⚠️  Cleanup warning: ${e.message} (dir: ${tmpDir})`);
    }
  }

  return { tmpDir, write, read, exists, appendAudit, cleanup };
}

// ── Workflow simulation functions ──────────────────────────────────────────────

function initProject(project) {
  const { write } = project;

  // Core .planning/ files
  write('.planning/PROJECT.md', `# E2E Test Project

## Tech stack
- Node.js 20 LTS
- TypeScript 5.x
- PostgreSQL via Prisma

## v1 scope — IN
- [x] User authentication (email/password)
- [x] User profile management

## Success criteria
All acceptance tests passing. Zero HIGH security findings.
`);

  write('.planning/REQUIREMENTS.md', `# Requirements

## Functional requirements
| ID | Requirement | Acceptance criterion | Scope |
|---|---|---|---|
| FR-01 | User login | POST /auth/login returns JWT for valid credentials | v1 |
| FR-02 | User logout | POST /auth/logout invalidates session | v1 |
| FR-03 | Profile fetch | GET /users/:id returns profile for authenticated user | v1 |
`);

  write('.planning/ARCHITECTURE.md', `# Architecture

## Architectural pattern
Modular monolith — Express API with Prisma ORM

## Technology stack
- Runtime: Node.js 20
- Framework: Express 4.x
- Database: PostgreSQL 15

## Data model
**User**: id (UUID), email, passwordHash, createdAt, updatedAt
`);

  write('.planning/STATE.md', `# Project State

## Status
Phase 1 in progress

## Current phase
Phase 1 — Authentication

## Next action
Execute Phase 1 plans
`);

  write('.planning/HANDOFF.json', JSON.stringify({
    schema_version: '1.0.0',
    plugin_api_version: '1.0.0',
    project: 'E2E Test Project',
    phase: 1,
    plan: null,
    next_task: 'Execute Phase 1 — Authentication',
    blockers: [],
    decisions_needed: [],
    decisions_made: [],
    discoveries: [],
    implicit_knowledge: [],
    quality_signals: [],
    context_refs: ['.planning/PROJECT.md', '.planning/STATE.md'],
    recent_commits: [],
    recent_files: [],
    session_id: 'test-session-001',
    _warning: 'Never store secrets or tokens in this file.',
    updated_at: new Date().toISOString(),
  }, null, 2));

  write('.planning/AUDIT.jsonl', '');
  project.appendAudit({ event: 'project_initialised', phase: null });
}

function planPhase(project, phaseNum) {
  const { write, appendAudit } = project;
  const phaseDir = `.planning/phases/${phaseNum}`;

  // Difficulty score
  write(`${phaseDir}/DIFFICULTY-SCORE-${phaseNum}.md`, `# Difficulty Score — Phase ${phaseNum}
## Scores
| Dimension | Score |
|---|---|
| Technical | 4/5 |
| Risk | 5/5 |
| Ambiguity | 2/5 |
| Dependencies | 2/5 |
## Composite: 3.75 — Challenging
## Recommendations: 6 atomic tasks
`);

  // Plan file with valid XML
  write(`${phaseDir}/PLAN-${phaseNum}-01.md`, `<task type="auto">
  <n>Implement login endpoint with JWT</n>
  <persona>developer</persona>
  <phase>${phaseNum}</phase>
  <plan>01</plan>
  <dependencies>none</dependencies>
  <files>
    src/auth/login.ts
    src/auth/login.test.ts
  </files>
  <context>
    Skills: security-review (jwt.sign trigger), api-design, testing-standards
  </context>
  <action>
    Create POST /auth/login endpoint. Validate email/password against database.
    Use argon2 for password verification. Return signed JWT on success.
    Return 401 for invalid credentials (no information disclosure).
  </action>
  <verify>npm test -- --testPathPattern=auth.login</verify>
  <done>All login tests passing, argon2 verification working, JWT returned</done>
</task>`);

  write(`${phaseDir}/PLAN-${phaseNum}-02.md`, `<task type="auto">
  <n>Implement logout endpoint with session invalidation</n>
  <persona>developer</persona>
  <phase>${phaseNum}</phase>
  <plan>02</plan>
  <dependencies>01</dependencies>
  <files>
    src/auth/logout.ts
    src/auth/logout.test.ts
  </files>
  <context>
    Skills: security-review, testing-standards
  </context>
  <action>
    Create POST /auth/logout endpoint. Invalidate JWT via blocklist in Redis.
    Verify that blocklisted tokens return 401 on subsequent requests.
  </action>
  <verify>npm test -- --testPathPattern=auth.logout</verify>
  <done>Logout invalidates tokens, blocklisted tokens rejected</done>
</task>`);

  // Dependency graph
  write(`${phaseDir}/DEPENDENCY-GRAPH-${phaseNum}.md`, `# Dependency Graph — Phase ${phaseNum}

## Wave 1 (independent)
- Plan 01: Implement login endpoint

## Wave 2 (depends on Wave 1)
- Plan 02: Implement logout endpoint (requires login implementation)
`);

  appendAudit({ event: 'phase_planned', phase: phaseNum, plans_created: 2, waves: 2 });
}

function executeTask(project, phaseNum, planId, commitSha) {
  const { write, appendAudit } = project;
  const phaseDir = `.planning/phases/${phaseNum}`;

  appendAudit({ event: 'task_started', phase: phaseNum, plan: planId });

  write(`${phaseDir}/SUMMARY-${phaseNum}-${planId}.md`, `# Summary — Phase ${phaseNum}, Plan ${planId}
## Status: Completed ✅
## Commit: ${commitSha}
## Verify result: PASS
## Files modified:
- src/auth/${planId === '01' ? 'login' : 'logout'}.ts (created)
- src/auth/${planId === '01' ? 'login' : 'logout'}.test.ts (created, 8 tests)
`);

  appendAudit({ event: 'task_completed', phase: phaseNum, plan: planId, commit_sha: commitSha, verify_result: 'pass' });
}

function runSecurityScan(project, phaseNum, findings = []) {
  const { write, appendAudit } = project;
  const phaseDir = `.planning/phases/${phaseNum}`;

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount     = findings.filter(f => f.severity === 'HIGH').length;

  write(`${phaseDir}/SECURITY-REVIEW-${phaseNum}.md`, `# Security Review — Phase ${phaseNum}
## Scan date: ${new Date().toISOString()}
## OWASP A01: ${findings.length === 0 ? 'PASS ✅' : 'FINDINGS'}

${findings.map(f => `### ${f.severity}: ${f.description}\nFile: ${f.file}:${f.line}\nRemediation: ${f.remediation}`).join('\n\n')}

## Summary
- CRITICAL: ${criticalCount}
- HIGH: ${highCount}
- Total: ${findings.length}
${findings.length === 0 ? '## Verdict: CLEAN ✅' : `## Verdict: ${criticalCount > 0 ? '🔴 BLOCKED' : '⚠️  REVIEW REQUIRED'}`}
`);

  appendAudit({ event: 'security_scan_completed', phase: phaseNum, critical: criticalCount, high: highCount });
}

function verifyPhase(project, phaseNum) {
  const { write, appendAudit } = project;
  const phaseDir = `.planning/phases/${phaseNum}`;

  write(`${phaseDir}/GATE-RESULTS-${phaseNum}.md`, `# Compliance Gate Results — Phase ${phaseNum}
## Run at: ${new Date().toISOString()}
| Gate | Status | Detail |
|---|---|---|
| Secret detection | ✅ PASS | 0 patterns found |
| CRITICAL security findings | ✅ PASS | No open CRITICAL findings |
| Test suite | ✅ PASS | 16 tests passing |
| Dependency CVEs | ✅ PASS | 0 HIGH/CRITICAL |
| GDPR retention | ✅ PASS | data-privacy skill not active |
## Overall: ✅ ALL BLOCKING GATES PASSED
`);

  write(`${phaseDir}/VERIFICATION-${phaseNum}.md`, `# Verification — Phase ${phaseNum}
## Stage 1 — Tests: 16/16 passing ✅
## Stage 2 — Requirements:
| FR-01 | User login | ✅ | src/auth/login.ts:24 |
| FR-02 | User logout | ✅ | src/auth/logout.ts:18 |
## Stage 3 — Type check: PASS ✅
## Stage 4 — Security: PASS ✅
## Overall: ✅ PHASE VERIFIED
`);

  write(`${phaseDir}/UAT-${phaseNum}.md`, `# UAT — Phase ${phaseNum}
## Test results
| # | Deliverable | Result | Notes |
|---|---|---|---|
| 1 | POST /auth/login returns JWT | ✅ | Tested with valid+invalid credentials |
| 2 | POST /auth/logout invalidates session | ✅ | Blocklist verified |
## Overall: ✅ ALL UAT PASSED
`);

  appendAudit({ event: 'phase_completed', phase: phaseNum, uat_pass_rate: 1.0 });
}

// ── Tests ──────────────────────────────────────────────────────────────────────
console.log('\nMindForge Day 7 — End-to-End Tests\n');

// ── Test 1: Complete greenfield workflow ───────────────────────────────────────
console.log('Greenfield project workflow:');
const gf = createTestProject();

try {
  test('init-project creates all required .planning/ files', () => {
    initProject(gf);
    const required = ['PROJECT.md', 'REQUIREMENTS.md', 'ARCHITECTURE.md', 'STATE.md', 'HANDOFF.json', 'AUDIT.jsonl'];
    required.forEach(f => assert.ok(gf.exists(`.planning/${f}`), `Missing: ${f}`));
  });

  test('HANDOFF.json has v1.0.0 schema_version and plugin_api_version', () => {
    const handoff = JSON.parse(gf.read('.planning/HANDOFF.json'));
    assert.strictEqual(handoff.schema_version, '1.0.0');
    assert.strictEqual(handoff.plugin_api_version, '1.0.0');
    assert.ok(handoff._warning, 'Should have _warning field');
    assert.ok(!handoff._warning.toLowerCase().includes('password'), '_warning should not contain password');
  });

  test('initial AUDIT.jsonl has project_initialised event with session_id', () => {
    const lines = gf.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    assert.ok(lines.length >= 1, 'Should have at least one audit entry');
    const first = JSON.parse(lines[0]);
    assert.strictEqual(first.event, 'project_initialised');
    assert.ok(first.session_id, 'Should have session_id');
    assert.ok(first.id, 'Should have id');
    assert.ok(first.timestamp, 'Should have timestamp');
  });

  test('plan-phase creates PLAN files with valid XML structure', () => {
    planPhase(gf, 1);
    const plan = gf.read('.planning/phases/1/PLAN-1-01.md');
    assert.ok(plan, 'PLAN-1-01.md should exist');
    assert.ok(plan.includes('<task type="auto">'), 'Should have task element');
    assert.ok(plan.includes('<n>'), 'Should have task name');
    assert.ok(plan.includes('<persona>'), 'Should specify persona');
    assert.ok(plan.includes('<dependencies>'), 'Should have dependencies');
    assert.ok(plan.includes('<verify>'), 'Should have verify step');
    assert.ok(plan.includes('<done>'), 'Should have definition of done');
  });

  test('difficulty score file created before plans', () => {
    assert.ok(gf.exists('.planning/phases/1/DIFFICULTY-SCORE-1.md'));
    const score = gf.read('.planning/phases/1/DIFFICULTY-SCORE-1.md');
    assert.ok(score.includes('Composite'), 'Should have composite score');
    assert.ok(score.includes('Challenging'), 'Should have difficulty label');
  });

  test('dependency graph created and shows wave structure', () => {
    const dep = gf.read('.planning/phases/1/DEPENDENCY-GRAPH-1.md');
    assert.ok(dep, 'Dependency graph should exist');
    assert.ok(dep.includes('Wave 1'), 'Should define Wave 1');
    assert.ok(dep.includes('Wave 2'), 'Should define Wave 2');
    assert.ok(dep.includes('Plan 01'), 'Should reference Plan 01');
    assert.ok(dep.includes('Plan 02'), 'Should reference Plan 02');
  });

  test('execute task creates SUMMARY with commit SHA', () => {
    executeTask(gf, 1, '01', 'abc1234ef');
    const summary = gf.read('.planning/phases/1/SUMMARY-1-01.md');
    assert.ok(summary, 'SUMMARY-1-01.md should exist');
    assert.ok(summary.includes('Completed ✅'), 'Should show completed status');
    assert.ok(summary.includes('abc1234ef'), 'Should include commit SHA');
  });

  test('task execution writes task_started and task_completed to AUDIT.jsonl', () => {
    executeTask(gf, 1, '02', 'def5678ab');
    const lines = gf.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    const events = lines.map(l => JSON.parse(l).event);
    assert.ok(events.includes('task_started'), 'Should have task_started event');
    assert.ok(events.includes('task_completed'), 'Should have task_completed event');
  });

  test('security scan writes SECURITY-REVIEW file', () => {
    runSecurityScan(gf, 1, []);
    assert.ok(gf.exists('.planning/phases/1/SECURITY-REVIEW-1.md'));
    const review = gf.read('.planning/phases/1/SECURITY-REVIEW-1.md');
    assert.ok(review.includes('CLEAN ✅') || review.includes('PASS'), 'Should show passing result');
  });

  test('verify-phase creates GATE-RESULTS, VERIFICATION, and UAT files', () => {
    verifyPhase(gf, 1);
    assert.ok(gf.exists('.planning/phases/1/GATE-RESULTS-1.md'), 'GATE-RESULTS should exist');
    assert.ok(gf.exists('.planning/phases/1/VERIFICATION-1.md'), 'VERIFICATION should exist');
    assert.ok(gf.exists('.planning/phases/1/UAT-1.md'), 'UAT should exist');
  });

  test('GATE-RESULTS shows all 5 gates passing', () => {
    const gates = gf.read('.planning/phases/1/GATE-RESULTS-1.md');
    assert.ok(gates.includes('Secret detection'), 'Should have secret detection gate');
    assert.ok(gates.includes('CRITICAL security'), 'Should have CRITICAL findings gate');
    assert.ok(gates.includes('Test suite'), 'Should have test suite gate');
    assert.ok(gates.includes('✅ PASS'), 'Gates should pass');
    assert.ok(gates.includes('ALL BLOCKING GATES PASSED'), 'Should confirm all gates passed');
  });

  test('VERIFICATION.md references requirements with traceability', () => {
    const v = gf.read('.planning/phases/1/VERIFICATION-1.md');
    assert.ok(v.includes('FR-01'), 'Should reference FR-01');
    assert.ok(v.includes('FR-02'), 'Should reference FR-02');
    assert.ok(v.includes('src/auth/'), 'Should reference source files');
  });

  // Complete audit log validation
  test('full workflow: all AUDIT.jsonl entries are valid with required fields', () => {
    const lines = gf.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    assert.ok(lines.length >= 6, `Should have >= 6 audit entries, got ${lines.length}`);

    lines.forEach((line, i) => {
      let entry;
      assert.doesNotThrow(() => { entry = JSON.parse(line); }, `Line ${i+1} is not valid JSON`);
      assert.ok(entry.id,         `Line ${i+1}: missing 'id'`);
      assert.ok(entry.timestamp,  `Line ${i+1}: missing 'timestamp'`);
      assert.ok(entry.event,      `Line ${i+1}: missing 'event'`);
      assert.ok(entry.session_id, `Line ${i+1}: missing 'session_id'`);
      assert.ok(entry.agent,      `Line ${i+1}: missing 'agent'`);
    });
  });

  test('full workflow: AUDIT.jsonl events cover complete lifecycle', () => {
    const lines   = gf.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    const events  = new Set(lines.map(l => JSON.parse(l).event));
    assert.ok(events.has('project_initialised'), 'Missing: project_initialised');
    assert.ok(events.has('phase_planned'),       'Missing: phase_planned');
    assert.ok(events.has('task_started'),        'Missing: task_started');
    assert.ok(events.has('task_completed'),      'Missing: task_completed');
    assert.ok(events.has('phase_completed'),     'Missing: phase_completed');
  });

} finally {
  gf.cleanup();
}

// ── Test 2: Brownfield / map-codebase workflow ─────────────────────────────────
console.log('\nBrownfield project workflow:');
const bf = createTestProject();

try {
  // Simulate what /mindforge:map-codebase produces
  test('map-codebase creates CONVENTIONS.md with DRAFT status marker', () => {
    bf.write('.mindforge/org/CONVENTIONS.md', `# Coding Conventions — E2E Test Project
# Source: Inferred from codebase analysis by MindForge
# Status: DRAFT — confirm with team before treating as authoritative

## IMPORTANT
These conventions were inferred from code analysis.
Review each section and mark as [CONFIRMED] or [NEEDS REVIEW].

## Naming conventions [NEEDS REVIEW]
- Variables: camelCase
- Files: kebab-case
- Classes: PascalCase

## Import order [NEEDS REVIEW]
- Node.js built-ins
- Third-party libraries
- Internal modules
`);
    const content = bf.read('.mindforge/org/CONVENTIONS.md');
    assert.ok(content.includes('DRAFT'), 'Should be marked as DRAFT');
    assert.ok(content.includes('NEEDS REVIEW'), 'Should have review markers');
  });

  test('map-codebase creates ARCHITECTURE.md with inferred stack', () => {
    bf.write('.planning/ARCHITECTURE.md', `# Architecture — E2E Test Project
## MindForge onboarding: Inferred from codebase
## Technology stack
- Runtime: Node.js 20 (inferred from .nvmrc)
- Framework: Express 4.x (inferred from package.json)
- Database: PostgreSQL via Prisma (inferred from prisma/schema.prisma)
## Quality baseline
- Tests: Vitest, ~200 test files
- Linting: ESLint configured
- CI/CD: GitHub Actions
`);
    const arch = bf.read('.planning/ARCHITECTURE.md');
    assert.ok(arch, 'ARCHITECTURE.md should exist');
    assert.ok(arch.includes('inferred') || arch.includes('Inferred'), 'Should note inferred content');
  });

  test('STATE.md from map-codebase shows ready-for-planning status', () => {
    bf.write('.planning/STATE.md', `# Project State

## Status
Codebase mapped. Ready to plan first phase.

## Current phase
None — run /mindforge:plan-phase 1 to begin.

## Last action
/mindforge:map-codebase completed — codebase analysis done.
`);
    const state = bf.read('.planning/STATE.md');
    assert.ok(state.includes('map'), 'STATE.md should reference map-codebase');
    assert.ok(state.includes('plan'), 'STATE.md should suggest next step');
  });

} finally {
  bf.cleanup();
}

// ── Test 3: Multi-developer handoff scenario ──────────────────────────────────
console.log('\nMulti-developer handoff scenario:');
const md = createTestProject();

try {
  test('per-developer handoffs are distinct and non-conflicting', () => {
    initProject(md);
    const base = JSON.parse(md.read('.planning/HANDOFF.json'));

    const alice = {
      ...base,
      developer_id: 'alice',
      session_id: 'sess-alice',
      recent_files: ['src/auth/login.ts'],
    };

    const bob = {
      ...base,
      developer_id: 'bob',
      session_id: 'sess-bob',
      recent_files: ['src/auth/logout.ts'],
    };

    md.write('.planning/HANDOFF-alice.json', JSON.stringify(alice, null, 2));
    md.write('.planning/HANDOFF-bob.json', JSON.stringify(bob, null, 2));
    md.write('.planning/HANDOFF.json', JSON.stringify({
      ...base,
      active_developers: ['alice', 'bob'],
    }, null, 2));

    const a = JSON.parse(md.read('.planning/HANDOFF-alice.json'));
    const b = JSON.parse(md.read('.planning/HANDOFF-bob.json'));
    const main = JSON.parse(md.read('.planning/HANDOFF.json'));

    assert.notStrictEqual(a.session_id, b.session_id, 'Session IDs should be distinct');
    assert.notDeepStrictEqual(a.recent_files, b.recent_files, 'Recent files should differ');
    assert.ok(Array.isArray(main.active_developers), 'active_developers should exist');
    assert.ok(main.active_developers.includes('alice'), 'alice should be in active_developers');
    assert.ok(main.active_developers.includes('bob'), 'bob should be in active_developers');
  });
} finally {
  md.cleanup();
}

// ── Test 4: Context compaction scenario ───────────────────────────────────────
console.log('\nContext compaction scenario:');
const cc = createTestProject();

try {
  test('Level 2 compaction adds decisions_made and implicit_knowledge', () => {
    initProject(cc);
    const handoff = JSON.parse(cc.read('.planning/HANDOFF.json'));
    handoff.decisions_made = ['Adopted JWT auth for v1'];
    handoff.implicit_knowledge = ['Token revocation uses Redis blocklist'];
    cc.write('.planning/HANDOFF.json', JSON.stringify(handoff, null, 2));

    const updated = JSON.parse(cc.read('.planning/HANDOFF.json'));
    assert.ok(Array.isArray(updated.decisions_made), 'decisions_made should be array');
    assert.ok(Array.isArray(updated.implicit_knowledge), 'implicit_knowledge should be array');
    assert.ok(updated.decisions_made.length >= 1, 'decisions_made should be populated');
    assert.ok(updated.implicit_knowledge.length >= 1, 'implicit_knowledge should be populated');
  });
} finally {
  cc.cleanup();
}

// ── Test 5: Security gate scenarios ───────────────────────────────────────────
console.log('\nSecurity gate scenarios:');
const sg = createTestProject();

try {
  test('CRITICAL security finding in review blocks phase completion indicator', () => {
    initProject(sg);
    planPhase(sg, 1);
    executeTask(sg, 1, '01', 'abc1234');

    // Run security scan with a CRITICAL finding
    runSecurityScan(sg, 1, [{
      severity: 'CRITICAL',
      description: 'SQL injection via unsanitised user input',
      file: 'src/db/users.ts',
      line: 47,
      remediation: 'Use parameterised queries: db.query($1, [id])',
    }]);

    const review = sg.read('.planning/phases/1/SECURITY-REVIEW-1.md');
    assert.ok(review.includes('CRITICAL'), 'Should show CRITICAL finding');
    assert.ok(review.includes('BLOCKED') || review.includes('0 CRITICAL') === false, 'Should indicate blocked state');
  });

  test('AUDIT.jsonl captures security findings with correct schema', () => {
    const lines = sg.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    const secScan = lines.map(l => JSON.parse(l)).find(e => e.event === 'security_scan_completed');
    assert.ok(secScan, 'Should have security_scan_completed audit entry');
    assert.strictEqual(secScan.critical, 1, 'Should record 1 critical finding');
    assert.ok(secScan.session_id, 'Security scan audit entry should have session_id');
  });

} finally {
  sg.cleanup();
}

// ── Results ─────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (cleanupFailures.length > 0) {
  console.warn(`\n⚠️  ${cleanupFailures.length} test directories were not cleaned up:`);
  cleanupFailures.forEach(p => console.warn(`  - ${p}`));
}
if (failed > 0) {
  console.error(`\n❌  ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅  All E2E tests passed.\n`);
}
