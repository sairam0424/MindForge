'use strict';

/**
 * Tests for the typed inter-agent message protocol (bin/autonomous/handoff-schema.js).
 * Mirrors ECC comms semantics: the 5 message kinds, priority enum + default,
 * legacy fallback, preview formatting, and makeMessage validation.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const proto = require('../bin/autonomous/handoff-schema.js');

test('validateMessage accepts each well-formed kind', () => {
  assert.ok(proto.validateMessage({ kind: 'task_handoff', task: 't', context: 'c' }).valid);
  assert.ok(proto.validateMessage({ kind: 'query', question: 'q' }).valid);
  assert.ok(proto.validateMessage({ kind: 'response', answer: 'a' }).valid);
  assert.ok(proto.validateMessage({ kind: 'completed', summary: 's' }).valid);
  assert.ok(proto.validateMessage({ kind: 'conflict', file: 'f', description: 'd' }).valid);
});

test('validateMessage rejects unknown kind and missing fields', () => {
  assert.strictEqual(proto.validateMessage({ kind: 'bogus' }).valid, false);
  assert.strictEqual(proto.validateMessage({ kind: 'query' }).valid, false); // no question
  assert.strictEqual(proto.validateMessage({ kind: 'conflict', file: 'f' }).valid, false); // no description
  assert.strictEqual(proto.validateMessage(null).valid, false);
});

test('validateMessage rejects bad priority and non-array files_changed', () => {
  assert.strictEqual(
    proto.validateMessage({ kind: 'task_handoff', task: 't', context: 'c', priority: 'urgent' }).valid,
    false
  );
  assert.strictEqual(
    proto.validateMessage({ kind: 'completed', summary: 's', files_changed: 'nope' }).valid,
    false
  );
});

test('handoffPriority defaults to normal and tolerates legacy/missing', () => {
  assert.strictEqual(proto.handoffPriority({ kind: 'task_handoff', task: 't', context: 'c' }), 'normal');
  assert.strictEqual(proto.handoffPriority({ kind: 'task_handoff', task: 't', context: 'c', priority: 'high' }), 'high');
  assert.strictEqual(proto.handoffPriority({ priority: 'garbage' }), 'normal'); // legacy fallback
  assert.strictEqual(proto.handoffPriority(null), 'normal');
});

test('preview formats each kind (priority shown only when not normal)', () => {
  assert.match(proto.preview({ kind: 'task_handoff', task: 'do X', context: 'c' }), /^handoff do X$/);
  assert.match(proto.preview({ kind: 'task_handoff', task: 'do X', context: 'c', priority: 'critical' }), /^handoff \[critical\] do X$/);
  assert.match(proto.preview({ kind: 'completed', summary: 'done', files_changed: ['a', 'b'] }), /\| 2 files$/);
  assert.match(proto.preview({ kind: 'conflict', file: 'app.ts', description: 'both edited' }), /^conflict app\.ts \| both edited$/);
});

test('makeMessage normalizes defaults and rejects invalid', () => {
  const m = proto.makeMessage('task_handoff', { task: 't', context: 'c' });
  assert.strictEqual(m.priority, 'normal');
  const c = proto.makeMessage('completed', { summary: 's' });
  assert.deepStrictEqual(c.files_changed, []);
  assert.throws(() => proto.makeMessage('query', {}), /invalid query message/);
});
