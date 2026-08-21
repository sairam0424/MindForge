#!/usr/bin/env node
/**
 * Executes a MindForge hook script only when enabled by hook profile flags.
 *
 * Ported/adapted from ECC (scripts/hooks/run-with-flags.js):
 * - env vars renamed ECC_* -> MINDFORGE_*
 * - getHookRoot() resolves the MindForge .agent root (parent of hooks/) instead
 *   of CLAUDE_PLUGIN_ROOT, with CLAUDE_PLUGIN_ROOT honored as an override for
 *   plugin-install layouts.
 *
 * Hooks that export run(rawInput) are require()'d in-process (saves a process
 * spawn). Legacy module-scope stdin hooks (most mindforge-* hooks) take the
 * spawnSync path.
 *
 * Usage:
 *   node .agent/hooks/run-with-flags.js <hookId> <scriptRelativePath> [profilesCsv]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { isHookEnabled, getDisabledHookIds, getHookProfile, normalizeId } = require('./lib/hook-flags');
const { buildPreToolUseAdditionalContext } = require('./lib/pretooluse-visible-output');

const MAX_STDIN = 1024 * 1024;

/**
 * Hooks whose entire job is to DENY. If one of these cannot produce a verdict, the safe answer
 * is "block", because nothing has established that the operation is safe.
 *
 * Measured contract, identical across all three: exit 0 = allow, exit 2 = block. (trust-gate
 * also writes {"decision":"block"} to stdout; the other two write a reason to stderr.) Exit 1 is
 * not in the contract at all — Claude Code does not read it as a denial.
 *
 * Every OTHER hook stays fail-open on purpose. context-monitor, session-init, check-update and
 * instinct-capture are advisory: if telemetry cannot run, nothing about the operation's safety
 * became unknown, and blocking a tool call because a logger failed would be indefensible.
 */
const DENY_CLASS = new Set([
  'trust-gate',
  'mindforge-block-no-verify',
  'mindforge-config-protection',
]);

/**
 * Escape hatch, deliberately loud.
 *
 * Rationale for having one at all: these gates fire on every Bash call for anyone working in a
 * MindForge checkout, so a latent crash in trust-gate would otherwise brick every tool call with
 * no way out but editing hook source. The reviewed risk of fail-closed behaviour was precisely
 * "visible unexplained tool-call denials". This makes the override explicit and auditable rather
 * than leaving the failure mode silent.
 */
const FAIL_OPEN_OVERRIDE = process.env.MINDFORGE_HOOK_FAILOPEN === '1';

/**
 * A hook could not produce a verdict. Decide what that means and exit.
 *
 * Before this, EVERY such path echoed stdin and exited 0 — which Claude Code reads as an explicit
 * ALLOW, indistinguishable from a hook that ran and approved. Measured paths that behaved this
 * way: a script that does not exist, a rejected path traversal (it printed "Path traversal
 * rejected" and then permitted), a run() that threw, a non-integer exitCode, and the top-level
 * catch. The spawn path exited 1 instead, which is out of contract and therefore also permits —
 * that one covers a hook TIMEOUT, where no exit 2 was previously reachable at all.
 *
 * @param {string} hookId
 * @param {string} raw   the original payload, echoed only when allowing
 * @param {string} reason
 */
function failed(hookId, raw, reason) {
  const isDenyClass = DENY_CLASS.has(hookId);

  if (isDenyClass && !FAIL_OPEN_OVERRIDE) {
    process.stderr.write(
      `[Hook] BLOCKED: ${hookId} could not run, so this operation was not checked — ${reason}\n` +
      `[Hook] ${hookId} is a deny-class gate; failing closed. Fix the hook, or set ` +
      'MINDFORGE_HOOK_FAILOPEN=1 to permit unchecked operations.\n');
    // No stdout: a block carries its reason on stderr (see mindforge-block-no-verify).
    process.exit(2);
  }

  if (isDenyClass) {
    process.stderr.write(
      `[Hook] FAIL-OPEN OVERRIDE: ${hookId} could not run (${reason}) and ` +
      'MINDFORGE_HOOK_FAILOPEN=1 is set, so the operation proceeds UNCHECKED.\n');
  } else {
    process.stderr.write(`[Hook] ${hookId} skipped (advisory) — ${reason}\n`);
  }

  process.stdout.write(raw);
  process.exit(0);
}

function readStdinRaw() {
  return new Promise(resolve => {
    let raw = '';
    let truncated = false;
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (raw.length < MAX_STDIN) {
        const remaining = MAX_STDIN - raw.length;
        raw += chunk.substring(0, remaining);
        if (chunk.length > remaining) {
          truncated = true;
        }
      } else {
        truncated = true;
      }
    });
    process.stdin.on('end', () => resolve({ raw, truncated }));
    process.stdin.on('error', () => resolve({ raw, truncated }));
  });
}

function writeStderr(stderr) {
  if (typeof stderr !== 'string' || stderr.length === 0) {
    return;
  }

  process.stderr.write(stderr.endsWith('\n') ? stderr : `${stderr}\n`);
}

function emitHookResult(raw, output) {
  if (typeof output === 'string' || Buffer.isBuffer(output)) {
    process.stdout.write(String(output));
    return 0;
  }

  if (output && typeof output === 'object') {
    writeStderr(output.stderr);

    if (Object.prototype.hasOwnProperty.call(output, 'additionalContext')) {
      process.stdout.write(buildPreToolUseAdditionalContext(output.additionalContext));
    } else if (Object.prototype.hasOwnProperty.call(output, 'stdout')) {
      process.stdout.write(String(output.stdout ?? ''));
    } else if (!Number.isInteger(output.exitCode) || output.exitCode === 0) {
      process.stdout.write(raw);
    }

    return Number.isInteger(output.exitCode) ? output.exitCode : 0;
  }

  process.stdout.write(raw);
  return 0;
}

function writeLegacySpawnOutput(raw, result) {
  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  if (stdout) {
    process.stdout.write(stdout);
    return;
  }

  if (Number.isInteger(result.status) && result.status === 0) {
    process.stdout.write(raw);
  }
}

/**
 * The roots this dispatcher can legitimately run under, derived from its OWN location.
 *
 *   plugin install    <pluginRoot>/scripts/run-with-flags.js    -> __dirname/..
 *   repo / npx        <root>/.agent/hooks/run-with-flags.js     -> __dirname/../..
 *   installed project <project>/.claude/hooks/run-with-flags.js -> __dirname/../..
 *
 * In every real layout the root is an ancestor of __dirname. That is the property the
 * CLAUDE_PLUGIN_ROOT check below relies on. A new layout must be added here deliberately —
 * failing closed on an unrecognised one is the point.
 */
function candidateRoots() {
  return [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '..', '..'),
  ];
}

/**
 * realpath if the path exists, plain resolve otherwise.
 *
 * This exists to prevent FALSE REJECTIONS, not to block an attack — a correction to my first
 * reading of it. An unrelated directory is rejected by the candidate comparison whether or not it
 * is a symlink, because its resolved path is not a candidate either way. What realpath buys is the
 * converse: a LEGITIMATE root reached by an equivalent path still matches. That happens routinely —
 * a symlinked checkout, or macOS reporting /tmp/x while process paths resolve to /private/tmp/x.
 * Comparing unresolved strings would reject those and silently fall back to the derived root.
 */
function canonical(p) {
  try { return fs.realpathSync(path.resolve(p)); } catch { return path.resolve(p); }
}

/**
 * Resolve the MindForge install root.
 *
 * CLAUDE_PLUGIN_ROOT is honoured ONLY when it names a root this dispatcher could actually be
 * running from. It used to be returned verbatim, which made it a gate-substitution primitive
 * rather than a relocation hint: the dispatcher resolves the hook script relative to this root,
 * so pointing the variable at an attacker-controlled directory makes an arbitrary file execute
 * WITH THE AUTHORITY OF THE SECURITY GATE. Measured against the real trust-gate:
 *
 *   unset                                   `rm -rf /` -> exit 2  (denied)
 *   CLAUDE_PLUGIN_ROOT=<dir with a stub>    `rm -rf /` -> exit 0  (APPROVED by the stub)
 *   CLAUDE_PLUGIN_ROOT=/tmp                 `rm -rf /` -> exit 2  (fails closed: no script there)
 *
 * The third case was already safe once deny-class hooks began failing closed. The second was
 * not, and no amount of fail-closed logic fixes it — the substituted gate returns a clean ALLOW.
 * The existing traversal guard does not help either, because the root it measures against is
 * exactly what moved.
 *
 * Rejection is loud and falls back to the derived root, so a mis-set variable degrades to the
 * correct gate rather than to no gate.
 */
function getHookRoot() {
  const derived = path.resolve(__dirname, '..', '..');
  const raw = process.env.CLAUDE_PLUGIN_ROOT;
  if (!raw || !raw.trim()) return derived;

  const requested = canonical(raw.trim());
  if (candidateRoots().some((c) => canonical(c) === requested)) {
    return requested;
  }

  process.stderr.write(
    `[Hook] IGNORING CLAUDE_PLUGIN_ROOT=${raw.trim()} — it is not a root this dispatcher runs ` +
    'from, and honouring it would resolve hook scripts out of an unrelated directory (executing ' +
    `them with the gate's authority). Using ${derived} instead.\n`);
  return derived;
}

async function main() {
  const [, , hookId, relScriptPath, profilesCsv] = process.argv;
  const { raw, truncated } = await readStdinRaw();

  if (!hookId || !relScriptPath) {
    process.stdout.write(raw);
    process.exit(0);
  }

  if (!isHookEnabled(hookId, { profiles: profilesCsv })) {
    // Leave a record. Switching a hook off used to be entirely silent — measured,
    // MINDFORGE_DISABLED_HOOKS=trust-gate gave exit 0 with EMPTY stderr, so a disabled security
    // gate was indistinguishable from a gate that ran and approved, in the log as well as in the
    // exit code. The two reasons are reported separately because they are different events: an
    // explicit opt-out is somebody's decision, while a profile mismatch is ordinary configuration.
    const explicitlyDisabled = getDisabledHookIds().has(normalizeId(hookId));
    if (explicitlyDisabled && DENY_CLASS.has(hookId)) {
      process.stderr.write(
        `[Hook] SECURITY GATE DISABLED: ${hookId} was switched off via MINDFORGE_DISABLED_HOOKS, ` +
        'so this operation ran unchecked.\n');
    } else if (explicitlyDisabled) {
      process.stderr.write(`[Hook] ${hookId} disabled via MINDFORGE_DISABLED_HOOKS.\n`);
    } else {
      process.stderr.write(
        `[Hook] ${hookId} not active for profile ${getHookProfile()} ` +
        `(registered for: ${profilesCsv || 'standard,strict'}).\n`);
    }
    process.stdout.write(raw);
    process.exit(0);
  }

  const hookRoot = getHookRoot();
  const resolvedRoot = path.resolve(hookRoot);
  const scriptPath = path.resolve(hookRoot, relScriptPath);

  // Prevent path traversal outside the install root. This branch previously printed
  // "Path traversal rejected" and then exited 0 — announcing an attack signal and permitting it.
  if (!scriptPath.startsWith(resolvedRoot + path.sep)) {
    failed(hookId, raw, `script path escapes the install root: ${scriptPath}`);
  }

  if (!fs.existsSync(scriptPath)) {
    failed(hookId, raw, `script not found at ${scriptPath}`);
  }

  // Prefer direct require() when the hook exports run(rawInput). Eliminates one
  // Node process spawn (~50-100ms). Only require() hooks that export run();
  // legacy hooks run side effects at module scope (stdin listeners, process.exit)
  // which would interfere with the parent process.
  let hookModule;
  const src = fs.readFileSync(scriptPath, 'utf8');
  const hasRunExport = /\bmodule\.exports\b/.test(src) && /\brun\b/.test(src);

  if (hasRunExport) {
    try {
      hookModule = require(scriptPath);
    } catch (requireErr) {
      process.stderr.write(`[Hook] require() failed for ${hookId}: ${requireErr.message}\n`);
      // Fall through to legacy spawnSync path
    }
  }

  if (hookModule && typeof hookModule.run === 'function') {
    try {
      const output = hookModule.run(raw, {
        hookId,
        hookRoot,
        scriptPath,
        truncated,
        maxStdin: MAX_STDIN
      });
      // A hook that returns an exitCode which is not an integer has produced a result we cannot
      // read. emitHookResult() coerced that to 0, so `{exitCode: '2'}` — a string, e.g. from
      // JSON round-tripping — silently became ALLOW. Absent exitCode is different and legitimate:
      // it means "allow, with a message".
      if (output && typeof output === 'object'
          && Object.prototype.hasOwnProperty.call(output, 'exitCode')
          && !Number.isInteger(output.exitCode)) {
        failed(hookId, raw, `run() returned a non-integer exitCode: ${JSON.stringify(output.exitCode)}`);
      }
      process.exit(emitHookResult(raw, output));
    } catch (runErr) {
      failed(hookId, raw, `run() threw: ${runErr.message}`);
    }
    process.exit(0);
  }

  // Legacy path: spawn a child Node process for hooks without run() export
  const result = spawnSync(process.execPath, [scriptPath], {
    input: raw,
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: hookRoot,
      MINDFORGE_HOOK_ROOT: hookRoot,
      MINDFORGE_HOOK_ID: hookId,
      MINDFORGE_HOOK_INPUT_TRUNCATED: truncated ? '1' : '0',
      MINDFORGE_HOOK_INPUT_MAX_BYTES: String(MAX_STDIN)
    },
    cwd: process.cwd(),
    timeout: 30000
  });

  writeLegacySpawnOutput(raw, result);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error || result.signal || result.status === null) {
    // Covers the 30s spawn TIMEOUT, which arrives as signal SIGTERM with a null status. Exiting 1
    // here meant a timed-out security gate permitted the operation: 1 is not in the 0-allow/
    // 2-block contract, so Claude Code does not read it as a denial.
    const failureDetail = result.error
      ? result.error.message
      : result.signal
        ? `terminated by signal ${result.signal}`
        : 'missing exit status';
    failed(hookId, raw, `child process failed: ${failureDetail}`);
  }

  if (!Number.isInteger(result.status)) {
    failed(hookId, raw, `child returned a non-integer status: ${String(result.status)}`);
  }

  // Enforce the contract: 0 = allow, 2 = block. Anything else is the hook ERRORING, not deciding.
  // Measured: a hook that throws at module scope exits 1, and 1 is not a denial Claude Code
  // honours — so a crashed security gate was permitting the very operation it exists to check.
  // Advisory hooks keep their status verbatim; only a deny-class gate turns an unreadable result
  // into a block, because only there does "we could not decide" mean "do not proceed".
  if (result.status !== 0 && result.status !== 2) {
    failed(hookId, raw, `child exited ${result.status}, which is outside the 0-allow/2-block contract`);
  }

  process.exit(result.status);
}

main().catch(err => {
  // The dispatcher itself failed. hookId is argv[2] — read it directly, because main() may have
  // thrown before assigning anything, and the class decision needs it.
  const hookId = process.argv[2] || '';
  if (DENY_CLASS.has(hookId) && !FAIL_OPEN_OVERRIDE) {
    process.stderr.write(
      `[Hook] BLOCKED: dispatcher failed for ${hookId} — ${err.message}\n` +
      '[Hook] deny-class gate; failing closed. Set MINDFORGE_HOOK_FAILOPEN=1 to override.\n');
    process.exit(2);
  }
  process.stderr.write(`[Hook] run-with-flags error: ${err.message}\n`);
  process.exit(0);
});
