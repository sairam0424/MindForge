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
    const command = fullCommand.split('\n')[0];

    if (isHighImpact(command)) {
      // Output a block reason (Claude Code shows this to the user)
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `[TrustGate] High-impact command detected: "${command.substring(0, 80)}..." — requires explicit user approval`
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
