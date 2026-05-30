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

    const command = event.tool_input?.command || '';

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
    // Fail open on parse errors (don't block the user on hook bugs)
    process.stderr.write('[trust-gate-hook] parse error: ' + e.message + '\n');
    process.exit(0);
  }
});
