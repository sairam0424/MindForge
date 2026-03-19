# MindForge — Skills Command
# Usage: /mindforge:skills [subcommand] [args]
# Subcommands: list | add | update | validate | info | search

## Subcommand: list
`/mindforge:skills list`

Read MANIFEST.md. Display all registered skills in a formatted table:

```
MindForge Skills Registry
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Tier 1 — Core Skills (10 installed)
  ────────────────────────────────────────────────────────────
  ✅  security-review     v1.0.0   stable
  ✅  code-quality        v1.0.0   stable
  ✅  api-design          v1.0.0   stable
  ✅  testing-standards   v1.0.0   stable
  ✅  documentation       v1.0.0   stable
  ✅  performance         v1.0.0   stable
  ✅  accessibility       v1.0.0   stable
  ✅  data-privacy        v1.0.0   stable
  ✅  incident-response   v1.0.0   stable
  ✅  database-patterns   v1.0.0   stable

  Tier 2 — Org Skills (0 installed)
  ────────────────────────────────────────────────────────────
  (none — run /mindforge:skills add to add org skills)

  Tier 3 — Project Skills (0 installed)
  ────────────────────────────────────────────────────────────
  (none)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total: 10 skills   |   Run /mindforge:skills validate to check health
```

## Subcommand: info
`/mindforge:skills info [skill-name]`

Display detailed information about a specific skill:

```
Skill: security-review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Version      : 1.0.0
  Status       : stable
  Tier         : 1 (Core)
  Min MindForge: 0.1.0
  Path         : .mindforge/skills/security-review/SKILL.md

  Triggers (25):
  auth, authentication, authorisation, authorization, login,
  logout, password, token, JWT, session, cookie, OAuth,
  payment, billing, stripe, PII, GDPR, personal data,
  upload, file upload, credentials, API key, secret, env,
  environment variable, encryption, hashing, bcrypt, argon2

  Changelog:
  1.0.0 — Initial stable release
```

## Subcommand: search
`/mindforge:skills search [keyword]`

Find which skills would activate for a given keyword:

```
/mindforge:skills search "database query"

  Matching skills for "database query":
  ────────────────────────────────────────────────────────────
  database-patterns  v1.0.0  [tier 1]  trigger: "database", "query"
  performance        v1.0.0  [tier 1]  trigger: "query time"

  These 2 skills would be automatically loaded for a task
  containing "database query" in its description.
```

## Subcommand: validate
`/mindforge:skills validate`

Run a health check on all installed skills:

```
Validating skills...

  ✅  security-review     — frontmatter valid, file readable, triggers: 29
  ✅  code-quality        — frontmatter valid, file readable, triggers: 14
  ✅  performance         — frontmatter valid, file readable, triggers: 31
  ⚠️  [org-skill-name]   — frontmatter valid but missing 'version' field
  ❌  [missing-skill]    — listed in MANIFEST.md but file not found

  Issues found: 2
  Run /mindforge:skills add to fix missing skills.
  Fix frontmatter issues manually in the SKILL.md file.
```

Validation checks:
1. Every manifest entry has a corresponding SKILL.md file
2. Every SKILL.md has: `name`, `version`, `status`, `triggers` in frontmatter
3. All versions are valid semver strings
4. No two skills at the same tier share the same trigger keyword (flag as ⚠️)
5. Every skill file is readable (not empty, not corrupted)

## Subcommand: add
`/mindforge:skills add [path-to-skill-dir]`

Register a new skill in the manifest:

1. Read the SKILL.md in the provided path
2. Validate the frontmatter (all required fields present)
3. Check for trigger keyword conflicts with existing skills
4. Ask the user: "Which tier should this skill be registered as? (2=Org / 3=Project)"
5. Add the entry to MANIFEST.md in the correct section
6. Run `/mindforge:skills validate` to confirm registration is clean
7. Commit: `feat(skills): register [skill-name] v[version] as tier [N] skill`

## Subcommand: update
`/mindforge:skills update [skill-name]`

Update a skill to a newer version:

1. Read current version from MANIFEST.md
2. Check the skill's changelog in SKILL.md for available updates
3. If MAJOR version change: show breaking changes, require confirmation
4. If MINOR or PATCH: update automatically
5. Update MANIFEST.md version entry
6. Run `/mindforge:skills validate` after update
7. Commit: `chore(skills): update [name] v[old] → v[new]`

## Error handling
- If MANIFEST.md does not exist: offer to create it with current skills
- If a skill name is not found: suggest similar names (fuzzy match)
- If validation finds critical errors: block any phase execution until fixed
  (A skills validation failure is a BLOCKING issue)
