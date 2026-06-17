#!/usr/bin/env node
'use strict';

const { isHighImpact } = require('./trust-boundaries');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(input);

    // Only gate Bash tool calls
    if (event.tool_name !== 'Bash') {
      process.exit(0); // allow
    }

    const fullCommand = event.tool_input?.command || '';

    // Check the whole command AND every individual line, blocking if ANY
    // segment is high-impact. Per-line scanning means a benign first line
    // cannot cloak a destructive command on a later line; the whole-string
    // check catches patterns a line split might fragment. This is a security
    // gate, so it errs toward blocking: a destructive keyword in (e.g.) a
    // commit message will prompt for approval rather than risk a cloaked
    // command slipping through. Approval friction is preferable to a bypass.
    const lines = fullCommand.split('\n');
    const offending = [fullCommand, ...lines].find((segment) => isHighImpact(segment));

    if (offending) {
      const display = offending.length > 80 ? offending.slice(0, 80) + '...' : offending;
      // Output a block reason (Claude Code shows this to the user)
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `[TrustGate] High-impact command detected: "${display}" — requires explicit user approval`
      }));
      process.exit(2); // block
    }

    process.exit(0); // allow
  } catch (e) {
    process.stderr.write('[trust-gate-hook] parse error (BLOCKING): ' + e.message + '\n');
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: '[TrustGate] Could not verify command safety — parse error'
    }));
    process.exit(2);
  }
});
