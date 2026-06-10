'use strict';

/**
 * Tests for the layered profile + orchestration-template resolver
 * (bin/models/profiles-loader.js). Mirrors ECC's config tests: inheritance +
 * append-prompt merge, cycle rejection, {{var}} interpolation, missing-var
 * fail-loud.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const { resolveAgentProfile, resolveOrchestrationTemplate } = require('../bin/models/profiles-loader.js');

test('resolveAgentProfile applies inheritance, merges tools, concatenates prompts', () => {
  const profiles = {
    base: {
      model: 'sonnet',
      allowedTools: ['Read'],
      permissionMode: 'plan',
      addDirs: ['docs'],
      appendSystemPrompt: 'Be careful.',
    },
    reviewer: {
      inherits: 'base',
      allowedTools: ['Edit'],
      disallowedTools: ['Bash'],
      tokenBudget: 1200,
      appendSystemPrompt: 'Review thoroughly.',
    },
  };
  const p = resolveAgentProfile(profiles, 'reviewer');
  assert.strictEqual(p.profileName, 'reviewer');
  assert.strictEqual(p.model, 'sonnet');
  assert.deepStrictEqual(p.allowedTools, ['Read', 'Edit']);
  assert.deepStrictEqual(p.disallowedTools, ['Bash']);
  assert.strictEqual(p.permissionMode, 'plan');
  assert.deepStrictEqual(p.addDirs, ['docs']);
  assert.strictEqual(p.tokenBudget, 1200);
  assert.strictEqual(p.appendSystemPrompt, 'Be careful.\n\nReview thoroughly.');
});

test('resolveAgentProfile rejects inheritance cycles', () => {
  const profiles = { a: { inherits: 'b' }, b: { inherits: 'a' } };
  assert.throws(() => resolveAgentProfile(profiles, 'a'), /inheritance cycle/);
});

test('resolveAgentProfile throws on unknown profile', () => {
  assert.throws(() => resolveAgentProfile({}, 'nope'), /Unknown agent profile/);
});

test('resolveOrchestrationTemplate interpolates vars and resolves steps', () => {
  const profiles = { reviewer: { model: 'sonnet' } };
  const templates = {
    feature_development: {
      description: 'Ship {{task}}',
      project: '{{project}}',
      profile: 'reviewer',
      worktree: true,
      steps: [
        { name: 'planner', task: 'Plan {{task}}', agent: 'claude' },
        { name: 'reviewer', task: 'Review {{task}} in {{component}}', profile: 'reviewer', worktree: false },
      ],
    },
  };
  const vars = { task: 'stabilize auth', project: 'mindforge', component: 'billing' };
  const t = resolveOrchestrationTemplate(templates, profiles, 'feature_development', vars);
  assert.strictEqual(t.templateName, 'feature_development');
  assert.strictEqual(t.description, 'Ship stabilize auth');
  assert.strictEqual(t.project, 'mindforge');
  assert.strictEqual(t.steps.length, 2);
  assert.strictEqual(t.steps[0].task, 'Plan stabilize auth');
  assert.strictEqual(t.steps[0].agent, 'claude');
  assert.strictEqual(t.steps[0].worktree, true); // inherits template default
  assert.strictEqual(t.steps[1].task, 'Review stabilize auth in billing');
  assert.strictEqual(t.steps[1].worktree, false); // step override
});

test('resolveOrchestrationTemplate fails loud listing missing variables', () => {
  const templates = {
    feature_development: { steps: [{ task: 'Plan {{task}} for {{component}}' }] },
  };
  assert.throws(
    () => resolveOrchestrationTemplate(templates, {}, 'feature_development', { task: 'fix retry' }),
    /missing orchestration template variable\(s\): component/
  );
});

test('resolveOrchestrationTemplate rejects unknown template and empty steps', () => {
  assert.throws(() => resolveOrchestrationTemplate({}, {}, 'nope', {}), /Unknown orchestration template/);
  assert.throws(() => resolveOrchestrationTemplate({ t: { steps: [] } }, {}, 't', {}), /has no steps/);
});
