# MindForge Skills Registry — Schema & Protocol

## Registry concept
The public MindForge Skills Registry is an npm-based distribution system.
Skills are published as npm packages with the `mindforge-skill-` prefix.
The registry leverages the existing npm ecosystem for versioning, discovery,
and distribution.

## Package naming convention
```
mindforge-skill-[category]-[name]
```

Examples:
- `mindforge-skill-security-owasp`       — OWASP security review skill
- `mindforge-skill-db-postgres-patterns` — PostgreSQL-specific patterns
- `mindforge-skill-frontend-react-a11y`  — React accessibility patterns
- `mindforge-skill-testing-playwright`   — Playwright E2E testing patterns
- `mindforge-skill-api-graphql`          — GraphQL API design patterns

## Package structure

```
mindforge-skill-[category]-[name]/
├── SKILL.md              ← The skill file (required)
├── package.json          ← npm metadata
├── README.md             ← Human documentation
├── CHANGELOG.md          ← Version history
├── examples/             ← Optional usage examples
│   └── example-task.md
├── scripts/              ← Optional helper scripts
│   └── helper.sh
└── tests/
    └── skill.test.js     ← Skill validation tests
```

## `package.json` for a skill package

```json
{
  "name": "mindforge-skill-security-owasp",
  "version": "1.2.0",
  "description": "OWASP Top 10 security review skill for MindForge",
  "keywords": [
    "mindforge",
    "mindforge-skill",
    "security",
    "owasp",
    "agentic-framework"
  ],
  "mindforge": {
    "type": "skill",
    "skill-name": "security-owasp",
    "category": "security",
    "min-mindforge-version": "0.5.0",
    "triggers": ["OWASP", "security review", "injection", "auth", "XSS"],
    "tier-recommendation": 1
  },
  "files": ["SKILL.md", "README.md", "examples/", "scripts/"],
  "license": "MIT",
  "homepage": "https://mindforge.dev/skills/security-owasp",
  "repository": { "type": "git", "url": "https://github.com/mindforge-dev/skill-security-owasp" }
}
```

## Registry discovery

The MindForge registry is the standard npm registry with keyword filtering:
```bash
# Search for skills
npm search mindforge-skill [query]

# Example searches:
npm search mindforge-skill security    # Find security skills
npm search mindforge-skill react       # Find React-specific skills
npm search mindforge-skill testing     # Find testing skills
```

## Registry quality standards

A skill package published to the MindForge registry must pass:
1. Schema validation: `npx mindforge-cc validate-skill ./SKILL.md`
2. Required metadata: package.json `mindforge` field fully populated
3. No malicious content: npm security audit passes
4. Version policy: follows semver with documented breaking changes
5. License: MIT, Apache-2.0, or BSD (GPL derivatives not accepted)

## Local registry (private skills)

Organisations with private skills can use:
- Private npm registry (Verdaccio, Artifactory, GitHub Packages)
- Configure in `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md`:
  ```
  MINDFORGE_SKILL_REGISTRY=https://npm.your-org.internal/
  ```
- Skills from private registry install with the same `npx mindforge-skills install` command
