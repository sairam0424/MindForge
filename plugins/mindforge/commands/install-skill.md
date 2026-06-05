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
6. Install to tier directory:
   ```bash
   node bin/mindforge-cli.js install-skill [skill-name] --tier [1|2|3]
   ```
7. Register in MANIFEST.md:
   ```bash
   node bin/mindforge-cli.js register-skill [skill-name] [version] [tier]
   ```
8. Write AUDIT entry:
   ```bash
   node bin/mindforge-cli.js audit-skill [skill-name] [version] [tier]
   ```
9. Confirm: "Run /mindforge:skills validate to verify installation"
