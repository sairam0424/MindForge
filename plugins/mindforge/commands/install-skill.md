---
description: "Follow the full installation protocol from .mindforge/distribution/registry-client.md."
---

Follow the full installation protocol from `.mindforge/distribution/registry-client.md`.

Steps:
1. Resolve package name from skill name.
2. Check if already installed (skip if same version, offer upgrade if newer).
3. Fetch from registry (npm or private if --registry specified).
4. Validate the skill:
   ```bash
   node bin/mindforge-cli.js validate-skill ./SKILL.md
   ```
5. Run injection guard check (handled by validator).
6. Install to tier directory (the literal `install` action token is required —
   `bin/skill-registry.js` deliberately has no default action, to stop an
   unvalidated write from happening by accident):
   ```bash
   node bin/mindforge-cli.js install-skill install [skill-name] --tier [1|2|3]
   ```
7. Register in MANIFEST.md (same deliberate requirement — literal `register` token):
   ```bash
   node bin/mindforge-cli.js register-skill register [skill-name] [version] [tier]
   ```
8. Write AUDIT entry (same — literal `audit` token):
   ```bash
   node bin/mindforge-cli.js audit-skill audit [skill-name] [version] [tier]
   ```
9. Confirm: "Run /mindforge:skills validate to verify installation"
