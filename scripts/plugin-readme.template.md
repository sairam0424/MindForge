# MindForge

MindForge is an agentic-intelligence framework for Claude Code. This plugin installs {{commands}} slash commands, {{agents}} subagents and {{skills}} skills, a set of governance hooks, and a local MCP server. Together they add a plan, execute and verify workflow, security review, a hash-chained audit log and cost-aware model routing to Claude Code sessions.

MIT licensed. Source and full documentation: https://github.com/sairam0424/MindForge

## Install

```text
/plugin marketplace add sairam0424/MindForge
/plugin install mindforge@mindforge
```

Node.js 18 or newer is required, because the hooks and the MCP server run on Node.

## What you get

- **Commands.** Every command is namespaced `/mindforge:*`. Run `/mindforge:help` for the full list. Common starting points are `/mindforge:plan-phase`, `/mindforge:execute-phase`, `/mindforge:verify-phase`, `/mindforge:security-scan`, `/mindforge:pr-review` and `/mindforge:costs`.
- **Subagents.** Specialist subagents that Claude Code can delegate work to.
- **Skills.** Claude Code loads a skill when a task matches its description. The `mindforge-protocol` skill carries the plan, execute and verify discipline.
- **MCP server.** A local server named `mindforge`. Its tools are listed below.
- **Hooks.** Hooks that guard risky commands and record an audit log, listed below.

## What runs on your machine

The hooks and the MCP server run locally and need no account. The shipped hook scripts make one outbound network request, described under Network access. None of the MCP server's tools opens a network connection except to a local browser daemon on 127.0.0.1.

Commands, agents and skills act only when you invoke them, and some of those reach outside your machine or need your own accounts and keys. They are listed under Commands and skills that use external services.

### Hooks

Hooks are started through `scripts/run-with-flags.js`, which runs the hook script only when the active profile enables it. The Event column shows the tools each hook is registered on. The last column says what the script actually inspects.

| Event | Hook id | What it does |
| --- | --- | --- |
| SessionStart | `mindforge-check-update` | Starts a background check for a newer MindForge release. See Network access. It compares against the version recorded by an `npx mindforge-cc` install. The result goes to a cache file that only the optional MindForge statusline reads, so with this plugin alone it has no visible effect. |
| SessionStart | `mindforge-session-init` | If the project has `.agent/skills/mindforge-neural-orchestrator/SKILL.md`, adds that skill's text to the session context. Otherwise it does nothing. |
| PreToolUse (Write, Edit, MultiEdit, Bash) | `mindforge-prompt-guard` | Scans Write and Edit calls that target `.planning/` for prompt-injection patterns. It only warns, and the warning goes to the agent. It never blocks. The other registered tools are ignored. |
| PreToolUse (Write, Edit, MultiEdit, Bash) | `mindforge-config-protection` | Blocks edits to existing linter, formatter, `tsconfig.json`, `tsconfig.base.json` and commit-lint files, matched by exact file name, so the agent fixes the code instead of weakening the checks. Bash writes are caught only for common patterns such as redirects, `tee`, `sed -i` and `cp` or `mv`. |
| PreToolUse (Bash) | `trust-gate` | Denies high-impact shell commands by matching the command text: recursive `rm`, force-push, destructive SQL, `sudo`, `eval`, `source`, running shell scripts, `pkill` and `killall`, recursive `chmod` and `chown`, piping a download into a shell, and similar. A command that only mentions one of these can be denied too. A denied command is not offered for approval. |
| PreToolUse (Bash) | `mindforge-block-no-verify` | Blocks `--no-verify` (and `-n` on commit) and `-c core.hooksPath=` on git commit, push, merge, cherry-pick, rebase and am. It checks the command text, so it discourages skipping git hooks but does not guarantee it. |
| PostToolUse (Bash, Edit, Write, MultiEdit, Agent, Task) | `mindforge-context-monitor` | Warns the agent when context usage is high. It reads a metrics file written by the MindForge statusline (`scripts/mindforge-statusline.js`), which this plugin does not register, so it does nothing unless you have set up that statusline yourself. Keeps a small state file in the OS temp directory. |
| PostToolUse (Bash, Task) | `instinct-capture` | Only when the project's `.mindforge/config.json` sets `instincts.mode` to `auto-capture`: appends an entry to the file named by `instincts.store_path` for each successful Bash command (the first 200 characters of the command, with secrets redacted) and each completed Task. Each entry is tagged with the repository folder name and a SHA-256 hash of the git origin URL, which it gets by running `git rev-parse` and `git remote get-url` locally. Otherwise it does nothing. |
| PreCompact, SubagentStart, SubagentStop | `mindforge-lifecycle-audit` | Appends a SHA-256 hash-chained entry to `.planning/AUDIT.jsonl` in the current project, creating `.planning/` if it does not exist. |

Set `MINDFORGE_DISABLED_HOOKS` to a comma-separated list of hook ids to switch hooks off. Set `MINDFORGE_HOOK_PROFILE` to `minimal`, `standard` or `strict` (default `standard`). The `minimal` profile runs only `mindforge-check-update`, `mindforge-session-init`, `trust-gate`, `mindforge-block-no-verify`, `mindforge-config-protection` and `mindforge-lifecycle-audit`. In this plugin `standard` and `strict` run the same hooks.

The three gates `trust-gate`, `mindforge-block-no-verify` and `mindforge-config-protection` fail closed: if one cannot run, the operation it guards is blocked. Setting `MINDFORGE_HOOK_FAILOPEN=1` lets such an operation proceed unchecked. Switching off a security gate with `MINDFORGE_DISABLED_HOOKS` prints a warning on stderr.

### MCP tools

Six tools only read: `mindforge_status`, `mindforge_health`, `mindforge_audit_log`, `mindforge_memory_query`, `mindforge_memory_find_related` and `mindforge_memory_stats`. They read project state, the audit log and the project knowledge base. `mindforge_memory_query` also reads the cross-project knowledge base at `~/.mindforge/global-knowledge-base.jsonl`, but only when it is called with `includeGlobal: true`. `mindforge_memory_find_related` always includes it.

`mindforge_memory_remember` is the only tool that writes to MindForge's own project files. It appends an entry to the project knowledge base at `.mindforge/memory/knowledge-base.jsonl`, never overwrites or deletes, and asks for your confirmation before it writes.

`mindforge_browse` is not read-only. It can navigate, click, type, take screenshots and assert in a persistent browser session, and it can reach any URL the agent gives it. It talks to a MindForge browser daemon on 127.0.0.1 (port 7338, or the `BROWSER_PORT` environment variable) and authenticates with the token in `.mindforge/.browser-daemon-token`. This plugin does not include or start that daemon. The tool returns an error unless you have started one from a full `npx mindforge-cc` install.

### Files written

- `.planning/AUDIT.jsonl` in the current project, by `mindforge-lifecycle-audit`. The hook creates `.planning/` if it is missing.
- The file named by `instincts.store_path`, by `instinct-capture`, when auto-capture is enabled.
- `.mindforge/memory/knowledge-base.jsonl` in the current project, by `mindforge_memory_remember`, after you confirm. The parent directory is created if it is missing.
- Short-lived `*.lock` files next to `.planning/AUDIT.jsonl` and the instinct store while they are being appended to.
- Small state files in the OS temp directory, by `mindforge-context-monitor` and `instinct-capture`.
- `cache/mindforge-update-check.json` under `~/.agent` (created if missing), or under `$CLAUDE_CONFIG_DIR` when that already holds a MindForge install, by `mindforge-check-update`. npm also writes to its own cache (`~/.npm`) when that hook runs.

### Network access

At the start of a session, `mindforge-check-update` runs `npm view mindforge-cc version` in a background process with a 10-second timeout. The command asks your configured npm registry for the latest published version of `mindforge-cc`. npm's default is registry.npmjs.org, and a project or user `.npmrc` can change it. No project files, prompts or usernames are passed to the command. npm may also run its own weekly self-update check unless you have disabled it. To turn this hook off, set `MINDFORGE_DISABLED_HOOKS=mindforge-check-update`.

No other shipped hook script makes an outbound network request. The MCP server talks to Claude Code over stdio, and the only network connection any of its tools opens is to the local browser daemon on 127.0.0.1.

### Commands and skills that use external services

These run only when you invoke them, and they use your own accounts, keys and tools:

- `/mindforge:consult` and `/mindforge:cross-review` send a sanitized prompt or diff to external model APIs.
- `/mindforge:sync-jira` and `/mindforge:sync-confluence` push to Jira and Confluence.
- `/mindforge:update`, `/mindforge:install-skill` and `/mindforge:publish-skill` run `npx` or `npm`.
- `/mindforge:ship` can push branches and open pull requests.
- Many research subagents list web search and web fetch among their tools.
- The GitHub skills (`github-issues`, `github-auth` and others) call the GitHub API with `curl`. To authenticate they read a token from `$GITHUB_TOKEN`, `~/.agent/.env` or `~/.git-credentials` and send it to api.github.com.
- The `pinggy-tunnel` skill exposes a local port to the internet through an SSH tunnel to pinggy.io, and the `arxiv` skill fetches from arxiv.org.

## License

MIT, as declared in the plugin manifest. The full text is at https://github.com/sairam0424/MindForge/blob/main/LICENSE
