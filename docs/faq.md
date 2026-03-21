# MindForge FAQ (v1.0.0)

## Is MindForge tied to Claude only?
No. MindForge supports Claude Code and Antigravity. Install with `--claude`,
`--antigravity`, or `--all`.

## Global vs local install?
- **Global:** installs to your home directory and applies to all projects.
- **Local:** installs to the current repo only. Local takes precedence.

## Does MindForge store secrets?
No. Credentials must stay in environment variables. MindForge never writes
secrets to files.

## Why did CI fail on Tier 3 changes?
Tier 3 (compliance) changes are blocked in CI by design. Use approvals.

## How do I uninstall?
```
npx mindforge-cc@latest --uninstall --claude --local
```
Uninstall does not delete `.planning/` or `.mindforge/`.

## How do I know which commands are available?
Run:
```
/mindforge:help
```

## Can I add custom commands?
Yes, via plugins or by adding command markdown files in your project.
Plugins are preferred for sharing and versioning.

## How do I update to the latest version?
```
/mindforge:update
/mindforge:update --apply
```
