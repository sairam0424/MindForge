'use strict';

/**
 * TDD-SPRINT PHASE 2 (RED)
 * Failing test for parseWorkflowArgs(input: string)
 *
 * Behavior: Splits a slash command of the form "/mindforge:wf-<name> <args>"
 * into { workflowName, args }. This test is written BEFORE the implementation
 * exists — it must fail with "Cannot find module" or similar until the Green
 * phase supplies the implementation.
 *
 * testDescription: "parseWorkflowArgs splits /mindforge:wf-<name> <args> into workflowName + args"
 * fileToCreate: "bin/parse-workflow-args.js"
 * whyItFails: "The module bin/parse-workflow-args.js does not exist yet, so require() throws MODULE_NOT_FOUND"
 */

const assert = require('assert');
const path = require('path');

// The module under test — does NOT exist yet (RED phase).
// Once bin/parse-workflow-args.js is created (GREEN phase) these will pass.
const { parseWorkflowArgs } = require(path.join(__dirname, '..', 'bin', 'parse-workflow-args.js'));

// ── Acceptance Criteria ──────────────────────────────────────────────────────

// AC-1: Full command with multi-word args
{
  const result = parseWorkflowArgs('/mindforge:wf-deep-research What is the future of AI?');
  assert.deepStrictEqual(result, {
    workflowName: 'deep-research',
    args: 'What is the future of AI?',
  }, 'AC-1: should extract workflowName and multi-word args');
}

// AC-2: Command with no args
{
  const result = parseWorkflowArgs('/mindforge:wf-tdd-sprint');
  assert.deepStrictEqual(result, {
    workflowName: 'tdd-sprint',
    args: '',
  }, 'AC-2: should return empty string args when none provided');
}

// AC-3: Args with leading/trailing whitespace are trimmed
{
  const result = parseWorkflowArgs('/mindforge:wf-code-audit   some path   ');
  assert.deepStrictEqual(result, {
    workflowName: 'code-audit',
    args: 'some path',
  }, 'AC-3: args must be trimmed of surrounding whitespace');
}

// AC-4: Single-word arg
{
  const result = parseWorkflowArgs('/mindforge:wf-perf-optimize  typescript');
  assert.deepStrictEqual(result, {
    workflowName: 'perf-optimize',
    args: 'typescript',
  }, 'AC-4: single-word arg should work correctly');
}

// AC-5: workflowName preserves internal hyphens
{
  const result = parseWorkflowArgs('/mindforge:wf-onboard-codebase');
  assert.strictEqual(result.workflowName, 'onboard-codebase', 'AC-5: hyphens in name preserved');
  assert.strictEqual(result.args, '', 'AC-5: empty args');
}

// ── Edge Cases ───────────────────────────────────────────────────────────────

// EC-1: null/undefined input throws TypeError
{
  assert.throws(
    () => parseWorkflowArgs(null),
    TypeError,
    'EC-1: null input must throw TypeError'
  );
}

// EC-2: empty string throws RangeError or returns null
{
  assert.throws(
    () => parseWorkflowArgs(''),
    Error,
    'EC-2: empty string input must throw'
  );
}

// EC-3: Non-slash-command string throws
{
  assert.throws(
    () => parseWorkflowArgs('not a slash command'),
    Error,
    'EC-3: non-slash command must throw'
  );
}

// EC-4: Missing wf- prefix throws
{
  assert.throws(
    () => parseWorkflowArgs('/mindforge:status'),
    Error,
    'EC-4: non-wf command must throw — only wf- workflows are valid'
  );
}

// EC-5: args containing colons (edge: URL-like args)
{
  const result = parseWorkflowArgs('/mindforge:wf-deep-research https://example.com');
  assert.strictEqual(result.workflowName, 'deep-research', 'EC-5: workflowName still correct with URL arg');
  assert.strictEqual(result.args, 'https://example.com', 'EC-5: URL arg preserved verbatim');
}

// EC-6: Extra internal whitespace in args is preserved (only leading/trailing trimmed)
{
  const result = parseWorkflowArgs('/mindforge:wf-tdd-sprint  word1   word2  ');
  assert.strictEqual(result.args, 'word1   word2', 'EC-6: internal whitespace preserved, outer trimmed');
}

console.log('parse-workflow-args: all RED-phase tests passed (module must now exist)');
