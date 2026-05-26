---
name: cli-design
version: 1.0.0
min_mindforge_version: 10.0.8
status: stable
triggers: cli design, command structure, flag design, positional argument, help text design, interactive prompt, exit code, cli ux, subcommand, cli argument parsing, cli error message, terminal output
---

# CLI Design

## When this skill activates

This skill activates when designing command-line interfaces, implementing argument parsing, writing help text, handling terminal output formatting, or improving CLI user experience. It applies to new CLI tools, adding commands to existing CLIs, and refactoring CLI ergonomics.

## Mandatory actions when this skill is active

### Before

1. Define the primary audience (developers, ops engineers, end users, CI systems).
2. Identify the core verbs/actions the CLI must support.
3. Survey existing CLIs in the same domain for convention alignment (users have muscle memory).
4. Determine if the CLI will be used interactively (TTY), in scripts (pipes), or both.
5. Choose the argument parsing library (Commander/yargs for Node, Click/Typer for Python, Cobra for Go, clap for Rust).

### During

**Command Structure:**
- Use verb-noun pattern: `app deploy staging`, `app config set key=value`.
- Group related actions under subcommands: `app auth login`, `app auth logout`.
- Keep top-level commands to 5-8 maximum. Use subcommands for depth.
- Command names: lowercase, no hyphens in primary commands (use hyphens in flags only).
- Avoid ambiguity: `app delete project` not `app rm proj` (clarity over brevity for destructive ops).

**Flags and Options:**
- Boolean flags: `--verbose`, `--force`, `--dry-run` (no value needed).
- Value flags: `--output json`, `--timeout 30s`, `--config ./my-config.yaml`.
- Short aliases for common flags: `-v` (verbose), `-f` (force), `-o` (output), `-q` (quiet).
- Required options should be positional arguments, not flags (reduce typing for common case).
- Provide sensible defaults: `--timeout 30s` rather than requiring explicit timeout every time.

**Positional Arguments:**
- Required arguments come first, optional arguments last.
- Maximum 2-3 positional arguments (beyond that, use flags for clarity).
- Name them descriptively in help text: `app deploy <environment> [version]`.
- Support reading from stdin when positional is missing: `echo "data" | app process`.

**Help Text Design:**
```
Usage: app <command> [options]

Commands:
  deploy    Deploy application to target environment
  config    Manage configuration settings
  status    Show current deployment status

Options:
  -v, --verbose    Show detailed output
  -q, --quiet      Suppress non-error output
  -h, --help       Show this help message
  --version        Show version number

Examples:
  app deploy staging              Deploy to staging
  app deploy prod --dry-run       Preview production deployment
  app config set region=us-east   Set region config
```
- One-line description per command (max 60 chars).
- Always include 2-3 examples showing real usage.
- Group options logically (common first, advanced last).
- `--help` must work on every subcommand.

**Interactive Prompts:**
- Only prompt when stdin is a TTY (check `process.stdin.isTTY` or equivalent).
- In CI/pipe mode: fail with clear error if required input is missing.
- Use confirmation prompts for destructive actions: "Delete 47 files? [y/N]".
- Default to the safe option (N for destructive, Y for read-only).
- Support `--yes` / `--no-input` flag to skip all prompts (for automation).

**Exit Codes:**
- `0` — Success. Command completed as expected.
- `1` — General error. Something went wrong during execution.
- `2` — Misuse. Invalid arguments, unknown flags, missing required input.
- `130` — Interrupted (Ctrl+C / SIGINT).
- Document non-standard exit codes if used (e.g., `3` = partial success).
- Always exit with non-zero on failure (scripts depend on this).

**Output Design:**
- **Human mode** (TTY): Colors, progress bars, tables, spinners.
- **Machine mode** (pipe/CI): Plain text or structured (JSON/CSV), no ANSI codes.
- Auto-detect: `if (stdout.isTTY) { prettyOutput() } else { jsonOutput() }`.
- Support `--output json` flag to force structured output regardless of TTY.
- Errors go to stderr, data goes to stdout (enables `app list | grep "prod"`).

**Error Messages:**
- **What went wrong**: "Failed to connect to database at localhost:5432."
- **Why it failed**: "Connection refused — is the database server running?"
- **What to do**: "Run `docker compose up db` to start the database."
- Never show raw stack traces to users (log them with `--verbose`).
- Include error codes for searchability: `[ERR_DB_CONNECT] Failed to connect...`.

### After

1. Every command has `--help` with description, usage pattern, and examples.
2. Exit codes are consistent and documented.
3. Output works correctly in both TTY and pipe modes.
4. Destructive commands require confirmation (skippable with `--yes`).
5. Error messages are actionable (user knows what to do next).

## Self-check before task completion

- [ ] Command structure follows verb-noun convention consistently.
- [ ] All flags have both long form (`--verbose`) and short form (`-v`) for common options.
- [ ] Help text includes real-world examples (not just abstract usage patterns).
- [ ] Interactive prompts are suppressed in non-TTY environments.
- [ ] Exit codes distinguish success (0), general error (1), and misuse (2).
- [ ] Output format adapts to context (pretty for humans, structured for scripts).
- [ ] Error messages include what failed, why, and what to do next.
- [ ] Destructive operations require explicit confirmation or `--force` flag.
