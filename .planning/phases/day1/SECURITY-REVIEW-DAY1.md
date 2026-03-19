# Day 1 Security Review — MindForge Foundation

## Findings

### MEDIUM — HANDOFF.json could capture secrets
- Risk: Session state files are tracked in git; secrets could be recorded.
- Recommendation: Add `_warning` field and explicit note in STATE.md. Add ADR documenting tracking decision.

### MEDIUM — .gitignore missing key/cert patterns
- Risk: Private keys or certs can be committed accidentally.
- Recommendation: Add `*.key` and `*.pem` to .gitignore.

### LOW — Installer overwrites CLAUDE.md without backup
- Risk: User's existing agent config could be lost.
- Recommendation: Add CLAUDE.md backup when overwriting non-MindForge files.
