#!/usr/bin/env node
/**
 * Config Protection Hook
 *
 * Blocks modifications to existing linter/formatter/tsconfig files. Agents
 * frequently weaken these to make checks pass instead of fixing the actual code.
 * This guard steers the agent back to fixing the source — directly reinforcing
 * the repo's own "no gate weakening" posture (commit 10de9c1).
 *
 * Ported from ECC (scripts/hooks/config-protection.js). Already exports
 * run(rawInput) so it runs in-process via run-with-flags.js. Pair with hook-flags
 * so a `standard`/`strict` profile can disable it during legitimate config
 * bootstrap (MINDFORGE_DISABLED_HOOKS=mindforge-config-protection).
 *
 * Exit codes:
 *   0 = allow (not a config file, or first-time creation of one)
 *   2 = block (existing config file modification attempted)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MAX_STDIN = 1024 * 1024;
let raw = '';

const PROTECTED_FILES = new Set([
  // ESLint (legacy + v9 flat config, JS/TS/MJS/CJS)
  '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml',
  'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts',
  // Prettier
  '.prettierrc', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.json', '.prettierrc.yml', '.prettierrc.yaml',
  'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs',
  // Biome
  'biome.json', 'biome.jsonc',
  // Ruff (Python)
  '.ruff.toml', 'ruff.toml',
  // Note: pyproject.toml intentionally NOT included — it carries project metadata
  // alongside linter config; blocking it would prevent legitimate dependency edits.
  // TypeScript compiler config (agents weaken strictness to silence type errors)
  'tsconfig.json', 'tsconfig.base.json',
  // Shell / Style / Markdown
  '.shellcheckrc', '.stylelintrc', '.stylelintrc.json', '.stylelintrc.yml',
  '.markdownlint.json', '.markdownlint.yaml', '.markdownlintrc',
  // MindForge governance configs — must never be silently weakened by an agent.
  // commitlint guards conventional commits; .czrc the commit tooling.
  'commitlint.config.js', '.czrc',
]);

function parseInput(inputOrRaw) {
  if (typeof inputOrRaw === 'string') {
    try {
      return inputOrRaw.trim() ? JSON.parse(inputOrRaw) : {};
    } catch {
      return {};
    }
  }
  return inputOrRaw && typeof inputOrRaw === 'object' ? inputOrRaw : {};
}

/**
 * Exportable run() for in-process execution via run-with-flags.js.
 */
/**
 * Return the protected path a Bash command would WRITE, or '' if it writes none.
 *
 * Deliberately conservative and pattern-specific rather than clever. This hook is deny-class, so a
 * false positive blocks a legitimate command; and every pattern here was chosen because the protected
 * file appears in an unambiguous write position:
 *
 *   > path        >> path      >| path        shell redirect
 *   tee ... path                              writes each named file
 *   sed -i ... path                           edits in place
 *   dd of=path                                writes the output file
 *   truncate ... path                         truncates the named file
 *   cp/mv src path                            path is the DESTINATION only when it is last
 *
 * NOT matched, on purpose: `cat path`, `grep x path`, `git diff path`, `< path`, and
 * `cp path /tmp/backup` — all reads. A pipeline is split on |, ; and && first, so
 * `cat tsconfig.json | grep strict` cannot be mistaken for a write.
 */
function bashWriteTarget(command) {
  if (!command) return '';
  const names = [...PROTECTED_FILES].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!names.length) return '';
  const anyName = `(?:${names.join('|')})`;
  // A path token ending in a protected basename, at a word boundary so `my-tsconfig.json` is not
  // mistaken for `tsconfig.json`.
  const PATH = `((?:[^\\s;|&<>]*[/])?${anyName})(?![\\w.-])`;

  // Normalise `>|` (bash's noclobber override) to `>` BEFORE splitting on pipelines. Splitting on a
  // bare `|` tears `>|` in half — `echo {} >| tsconfig.json` became the segments `echo {} >` and
  // ` tsconfig.json`, so the redirect pattern found nothing and the write was permitted. The
  // segmentation was defeating the operator match it exists to support. `>|` and `>` are the same
  // write as far as this gate is concerned, so collapsing them is exact, not a heuristic.
  const normalised = command.replace(/>\s*\|/g, '>');
  for (const segment of normalised.split(/\|\||&&|[;|\n]/)) {
    const s = segment.trim();
    if (!s) continue;
    const checks = [
      new RegExp(`>>?\\|?\\s*${PATH}`),                       // redirect
      new RegExp(`\\btee\\b(?:\\s+-\\S+)*\\s+${PATH}`),        // tee [flags] path
      new RegExp(`\\bsed\\b[^\\n]*?\\s-i\\S*[^\\n]*?\\s${PATH}`), // sed -i ... path
      new RegExp(`\\bdd\\b[^\\n]*?\\bof=${PATH}`),             // dd of=path
      new RegExp(`\\btruncate\\b[^\\n]*?\\s${PATH}`),          // truncate ... path
      new RegExp(`\\b(?:cp|mv|install)\\b[^\\n]*?\\s${PATH}\\s*$`), // destination is the LAST token
    ];
    for (const re of checks) {
      const m = s.match(re);
      if (m) return m[1];
    }
  }
  return '';
}

function run(inputOrRaw, options = {}) {
  if (options.truncated) {
    return {
      exitCode: 2,
      stderr:
        `BLOCKED: Hook input exceeded ${options.maxStdin || MAX_STDIN} bytes. ` +
        'Refusing to bypass config-protection on a truncated payload. ' +
        'Retry with a smaller edit or disable the config-protection hook temporarily.'
    };
  }

  const input = parseInput(inputOrRaw);
  let filePath = input?.tool_input?.file_path || input?.tool_input?.file || '';

  // A Bash command reaches the same files by a different door.
  //
  // Measured before this: an Edit targeting an existing tsconfig.json returned exit 2, while
  // `echo {} > tsconfig.json` as a Bash command returned exit 0 — and trust-gate permitted it too.
  // The identical outcome was blocked through one tool surface and silently permitted through
  // another, with no warning on the permitted path. That is what made "Non-Bypassable Compliance
  // Gates" unsupportable: not a disabled gate, a gate watching one entrance.
  //
  // Only WRITE intent counts. `cat tsconfig.json`, `grep x tsconfig.json` and
  // `cp tsconfig.json /tmp/backup` are reads of a protected file and must pass — a gate that blocks
  // reading its own protected files would be worse than the hole it closes, and this hook is
  // deny-class, so a false positive blocks the operator's real work.
  if (!filePath) {
    const target = bashWriteTarget(String(input?.tool_input?.command || ''));
    if (target) filePath = target;
  }
  if (!filePath) return { exitCode: 0 };

  const basename = path.basename(filePath);
  if (PROTECTED_FILES.has(basename)) {
    // Allow first-time creation — there's no existing config to weaken. Fail
    // closed on any stat error other than ENOENT. lstatSync so a (possibly
    // dangling) symlink at the protected path is treated as present.
    let exists = true;
    try {
      fs.lstatSync(filePath);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        exists = false;
      }
      // Any other error (EACCES, EPERM, ELOOP) leaves exists=true — never weaken.
    }

    if (!exists) {
      return { exitCode: 0 };
    }

    // The deny reason no longer names the env var that turns this gate off.
    //
    // A PreToolUse denial is delivered to the MODEL whose tool call was just refused, so the old
    // message ended by telling the agent it had blocked exactly how to stop being blocked
    // ("disable the config-protection hook temporarily (MINDFORGE_DISABLED_HOOKS)"). A control
    // that hands out its own bypass in the refusal is a suggestion, not a control.
    //
    // The escape hatch still exists and is documented in this file's header for the HUMAN
    // operator, who is the party entitled to use it — and run-with-flags.js now writes
    // "SECURITY GATE DISABLED" to stderr whenever it is used, so exercising it leaves a record.
    return {
      exitCode: 2,
      stderr:
        `BLOCKED: Modifying ${basename} is not allowed. ` +
        'Fix the source code to satisfy linter/formatter/tsconfig rules instead ' +
        'of weakening the config. A legitimate config change needs a human decision, ' +
        'not a hook bypass — ask the operator.'
    };
  }

  return { exitCode: 0 };
}

module.exports = { run };

// Stdin fallback for spawnSync execution (when invoked directly, not via require)
if (require.main === module) {
  let truncated = /^(1|true|yes)$/i.test(String(process.env.MINDFORGE_HOOK_INPUT_TRUNCATED || ''));
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (raw.length < MAX_STDIN) {
      const remaining = MAX_STDIN - raw.length;
      raw += chunk.substring(0, remaining);
      if (chunk.length > remaining) truncated = true;
    } else {
      truncated = true;
    }
  });

  process.stdin.on('end', () => {
    const result = run(raw, {
      truncated,
      maxStdin: Number(process.env.MINDFORGE_HOOK_INPUT_MAX_BYTES) || MAX_STDIN
    });

    if (result.stderr) {
      process.stderr.write(result.stderr + '\n');
    }

    if (result.exitCode === 2) {
      process.exit(2);
    }

    process.stdout.write(raw);
  });
}
