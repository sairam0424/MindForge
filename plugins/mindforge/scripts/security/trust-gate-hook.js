#!/usr/bin/env node
'use strict';

const { isHighImpact } = require('./trust-boundaries');

/**
 * WHY THERE IS NO TOOL-NAME CHECK HERE.
 *
 * THE DEFECT. This hook used to open with `if (event.tool_name !== 'Bash') process.exit(0)`, so a
 * deny-class gate permitted every call whose tool was not spelled with that exact string. Measured
 * against the real hook with one destructive command and only the tool name varied:
 *
 *     tool_name=Bash              -> DENY (exit 2)
 *     tool_name=Shell             -> PERMIT (exit 0)
 *     tool_name=shell             -> PERMIT (exit 0)
 *     tool_name=PowerShell        -> PERMIT (exit 0)
 *     tool_name=run_terminal_cmd  -> PERMIT (exit 0)
 *     tool_name=Terminal          -> PERMIT (exit 0)
 *
 * That is reachable today, not hypothetical. Verified inside cursor-agent 2026.04.17's own bundle:
 * it loads the exact file the installer writes —
 *
 *     claudeProjectConfigPath: join(e, ".claude", "settings.json")
 *     claudeUserConfigPath:    join(homedir(), ".claude", "settings.json")
 *
 * — and translates Claude matcher names to its own tool names through
 * `{Bash:"Shell", Read:"Read", Write:"Write", Edit:"Write", Grep:"Grep", ...}`, while its hook
 * normaliser defaults to `{loop_limit:null, failClosed:!1}`. So opening a MindForge-installed project
 * in Cursor silently drops this gate, and its shell payload carries the SAME
 * `{command, workingDirectory, timeout}` shape — meaning nothing but the name check stood between a
 * destructive command and execution, while the install receipt reported three deny-class hooks
 * verified blocking.
 *
 * THE SCOPE IS `tool_input.command`, AND THAT IS SUFFICIENT. No name list replaces the check, because
 * a list only ever covers the harnesses someone thought to enumerate and the next one that spells its
 * tool differently reopens the hole in silence. Every shell tool observed — Claude Code's Bash and
 * Cursor's Shell — passes the command as `tool_input.command`, so reading that field IS the scoping:
 * a Write, Edit, Read or Grep payload has no `.command`, yields the empty string, and is permitted
 * without a name ever being consulted. An unknown harness using the conventional shape now fails
 * CLOSED instead of open.
 *
 * A FIRST ATTEMPT AT THIS FIX ADDED A `looksLikeShellCall()` GUARD, and falsification proved it did
 * nothing. Deleting that guard outright left all 14 tests green, because the extraction below already
 * scopes the gate. Its comment claimed removal would over-block Write payloads whose CONTENT mentions
 * a destructive command — measurably false, since such payloads carry no `.command`. Keeping it would
 * have shipped machinery that looks like enforcement and performs none, which is the exact defect
 * class this gate was being repaired for. So it is gone, and this comment stands in its place.
 *
 * MCP calls are unaffected: Cursor passes `tool_input: JSON.stringify(d)` for those, so `.command` on
 * a string is undefined and the gate declines rather than guessing.
 */

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(input);

    // Scoped by payload shape, NOT by tool name — see the header for the measured fail-open this
    // replaces. A non-executing call has no `.command`, so it yields '' and is permitted below.
    const fullCommand = (typeof event.tool_input?.command === 'string' ? event.tool_input.command : '');

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
