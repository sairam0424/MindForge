# MindForge — Install Skill Command
# Usage: /mindforge:install-skill [skill-name|package-name] [--tier 1|2|3] [--registry URL]

Follow the full installation protocol from `.mindforge/distribution/registry-client.md`.

Steps:
1. Resolve package name from skill name
2. Check if already installed (skip if same version, offer upgrade if newer)
3. Fetch from registry (npm or private if --registry specified)
4. Validate the skill (Level 1 + Level 2 from skill-validator.md)
5. Run injection guard check
6. Install to tier directory (default: Tier 2 org skill)
7. Register in MANIFEST.md
8. Write AUDIT entry
9. Confirm: "Run /mindforge:skills validate to verify installation"
