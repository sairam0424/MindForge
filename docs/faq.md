# MindForge FAQ (v11.8.3)

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

## Dynamic Workflows

**Q: How many workflows does MindForge v11.8.3 include?**
32 pre-built multi-agent workflows across 5 tiers: Research (5), Dev (12), Ops (6), Intelligence (6), Beast (3).

**Q: How do I run a workflow?**
Via Claude Code slash command: `/mindforge:wf-code-audit`
Via CLI: `node bin/mindforge-cli.js workflow list` to browse, then `workflow info <name>` for details.

**Q: What is the Beast tier?**
Beast tier workflows run 5 phases with 8+ concurrent agents and adversarial 3-vote verification. Included: `security-hardening`, `accessibility-audit`, `security-threat-model`.

**Q: Why are there only 32 workflows when some docs say 33?**
The `deep-research` workflow was removed before the v11.8.0 release (the superpowers built-in `/deep-research` covers this better). The correct count is 32.

## Version & Stability

**Q: What version is current?**
v11.8.3 — verify with `node bin/mindforge-cli.js --version`

**Q: Is v11.8.3 production-stable?**
Yes. The IQ200 deep-audit (258 discrete checks across 14 dimensions) shows 258/258 passing. 0 CVEs, 0 test failures, 0 ESLint errors, 0 TypeScript errors.

**Q: What npm dist-tags point to v11.8.3?**
Both `latest` and `stable`: `npx mindforge-cc@stable` or `npx mindforge-cc@latest`

## Known Limitations

**Q: Why does `spawn architect` exit with an error?**
Spawn dispatch is not yet implemented in v11.8.3. Use `/mindforge:auto` or `/mindforge:next` from Claude Code instead.

**Q: Why does ZTAI show a Tier-3 warning?**
Tier-3 trust uses in-process key simulation in v11.8.3 — this is intentional and safe. `SECURITY_TIER_3_SIMULATED = true` is the documented v11.x behavior. Hardware TPM/HSM is planned for v12.x.

**Q: What is the test coverage?**
95/97 tests passing (0 failures, 2 permanently env-skipped). Line coverage ~66% — gaps are in `bin/source-loader.js` and `scripts/ci/validate-assets.js`. Target is 80% for v11.9.0.
