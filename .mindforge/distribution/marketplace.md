# MindForge v2 — Community Skills Marketplace

## Purpose
The MindForge Marketplace is a distribution network for reusable AI skills.
It leverages the `mindforge-skill-` npm package prefix for discovery.

## Naming conventions
Skills published to the marketplace MUST follow this naming convention:
`mindforge-skill-[technology-or-pattern]`

Example:
- `mindforge-skill-prisma-schema`
- `mindforge-skill-zod-api-contracts`
- `mindforge-skill-stripe-webhooks`

## Marketplace categories
Skills are grouped into these canonical categories:
1. **Engines & Runtimes** (Node.js, Python, Go, Rust)
2. **Databases & ORMs** (Prisma, Drizzle, Kysely, Sequelize)
3. **API & Integration** (Stripe, Twilio, OpenAI, Anthropic)
4. **UI & Frontend** (React, Next.js, Tailwind, Radix)
5. **Patterns & Security** (Auth, RBAC, Validation, Error Handling)

## Quality requirements
To be listed in the marketplace, a skill MUST:
- Achieve a quality score of ≥ 80/100
- Pass all level 1 + level 2 validation checks
- Include at least 5 complete, working code examples
- Be free of any placeholder text
- Be licensed under MIT or Apache-2.0

## Publishing process
1. Run `/mindforge:learn` to generate/update the skill.
2. Achieve score ≥ 80 using `skill-scorer.js`.
3. Fill in the optional `author`, `license`, and `category` fields in frontmatter.
4. Run `/mindforge:marketplace publish [skill-name]`.
   - This prepares the `package.json`.
   - Runs final verification.
   - Prompts for `npm publish`.

## Interaction interface
```
/mindforge:marketplace search [query]       # Search the marketplace
/mindforge:marketplace featured             # Show featured skills
/mindforge:marketplace trending             # Show trending skills
/mindforge:marketplace info [name]           # Show skill details and quality score
/mindforge:marketplace install [name]        # Install a community skill
/mindforge:marketplace publish [name]        # Publish your skill
```

## Marketplace Registry
By default, the marketplace uses the global npm registry with the `mindforge-skill-` prefix.
Private registries can be configured via `MARKETPLACE_REGISTRY` in MINDFORGE.md.
