# Contributing to MindForge

MindForge is a pure-JS Node runtime (zero native deps) plus a separate TypeScript SDK. This
file covers the mechanics of contributing. For architecture, the task lifecycle, and where
things live in the codebase, `CLAUDE.md` is the authoritative reference — read that first if
you're orienting yourself.

## Getting started

Requires Node >= 18.

```bash
git clone https://github.com/sairam0424/MindForge.git
cd MindForge
npm install
npm test
```

`npm test` runs `scripts/ci/validate-assets.js` (frontmatter schema + unicode-safety checks
across all markdown) then `tests/run-all.js`, which discovers and runs every `tests/**/*.test.js`
file — 140 files today, each a self-contained Node process using the built-in `assert` module.
No Jest, no Mocha. Expect 137 passed, 3 skipped (`browser.test.js`,
`browser-daemon-auth-live.test.js`, `sre-integration.test.js` need a Chromium daemon/display or
git worktree support this environment may not have).

Useful variants:

```bash
node tests/<name>.test.js                     # run one test file directly
node tests/run-all.js --filter=security,audit # subset by filename substring (comma list)
npm run lint                                  # eslint . (single quotes + semicolons enforced)
npm run coverage                              # npx c8 node tests/run-all.js
```

The SDK (`sdk/`) and MCP server (`mcp-server/`) are separate packages with their own
`package.json` and lockfile — neither is exercised by the root `npm test`. The SDK has a real
test suite: `cd sdk && npm install && npm test`. The MCP server has no test script, only
`build` and `typecheck`: `cd mcp-server && npm install && npm run typecheck`.

## Making a change

1. Branch off `main`: `git checkout -b fix/short-description` or `feat/short-description`.
2. Write the code. Prefer editing `.mindforge/` engine specs or `.agent/`/`.claude/`
   command/skill markdown over hardcoding behavior in `bin/` where the two overlap — the
   spec files are what ships and what the skill-loader actually reads.
3. Add or update a test in `tests/`. There's no coverage gate enforced locally, but CI checks
   lines at 30% via `npm run coverage`.
4. Run `npm test` and `npm run lint` before committing.
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `npm run commit`
   runs the Commitizen prompt. Add a trailing `(UC-XX)` use-case reference if the change maps
   to one.
6. Open a PR against `main` using the existing template.

## Adding a skill

Two tiers, both validated by `validate-assets.js` on every `npm test` run:

- **Extended tier** (`.agent/skills/<name>/SKILL.md`) — lenient schema, just needs a `name:`
  field and a non-empty body. Activated explicitly (`/mindforge:skills-index`, or "use the
  X skill"). Start here.
- **Engine tier** (`.mindforge/skills/<name>/SKILL.md`) — strict schema, auto-triggers on
  every task via `triggers:` matching. Requires `name`, `version`, `status: stable`,
  `triggers:` (≥10 comma-separated terms, unique across all 232 existing engine skills — this
  is asserted by `tests/skills-platform.test.js`), a `## Mandatory actions` section, and a
  `- [ ]` checklist in the body. Promote to this tier only once the extended-tier version is
  proven useful.

## Version numbers

**Never hand-edit a version string outside `package.json`.** `package.json`'s `version`
field is canonical; 15 other files are derived from it across 16 channels (SDK, MCP server,
lockfiles, `MINDFORGE.md`, `AGENTS.md`, the Homebrew formula, `Dockerfile`, the plugin
marketplace entry, etc.). After bumping `package.json`, run:

```bash
node scripts/sync-version.js
```

It reports which channels moved, which need a rebuild (`mcp-server/dist` and the bundled
plugin — rebuild with `npm --prefix mcp-server install && npm --prefix mcp-server run build
&& node scripts/build-mindforge-plugin.js`), and correctly leaves the Homebrew formula alone
until the corresponding npm release actually exists (`--fetch-sha` picks it up afterward).
`tests/version-consistency.test.js` asserts every channel matches.

## Security-sensitive changes

Anything touching auth, payments, PII, or file uploads should get a security-focused look
before merging — run `node bin/mindforge-cli.js security-scan` and resolve Medium+ findings.
See `SECURITY.md` for the vulnerability-disclosure process; **do not** open a public issue
for a security report.

## Reporting bugs / requesting features

Use the issue templates — they ask for the specific version, install method, and repro steps
that make a bug actually actionable. Before filing a feature request, a quick check of
`/mindforge:skills-index` or `docs/registry/` is worth it: MindForge already ships 221 slash
commands, 355 skills, 164 subagents, and 35 dynamic workflows, so there's a real chance
what you want already exists.

## License

MIT — see `LICENSE`. By contributing, you agree your contributions are licensed under the
same terms.
