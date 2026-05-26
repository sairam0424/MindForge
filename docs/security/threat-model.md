# MindForge v1.0.0 — Threat Model

## Scope
All attack surfaces introduced by MindForge across 7 days of development.
Last reviewed: v1.0.0 release (March 2026).

## Assets being protected

| Asset | Classification | Location |
|---|---|---|
| API credentials | CRITICAL | Environment variables only (never in files) |
| HANDOFF.json | HIGH — project state, agent notes, decisions | `.planning/HANDOFF.json` |
| AUDIT.jsonl | HIGH — complete governance audit trail | `.planning/AUDIT.jsonl` |
| Approval files | HIGH — governance records | `.planning/approvals/*.json` |
| SECURITY.md | MEDIUM — security policy documentation | `.mindforge/org/SECURITY.md` |
| CLAUDE.md | MEDIUM — agent instructions that shape behaviour | `.claude/CLAUDE.md` |
| CONVENTIONS.md | LOW — coding standards | `.mindforge/org/CONVENTIONS.md` |

## Threat Actor 1 — Malicious skill package author

**Goal:** Inject adversarial instructions via a published `mindforge-skill-*` npm package.
**Attack:** SKILL.md contains "IGNORE ALL PREVIOUS INSTRUCTIONS" or similar.
**Controls:**
- Injection guard in `loader.md` blocks known patterns at both install and load time
- Level 1/2/3 skill validation at install time
- TOCTOU-safe download (chmod 700 temp dir, tarball size check)
- User must explicitly run `/mindforge:install-skill` — no auto-install

**Residual risk:** MEDIUM — sophisticated injections that avoid simple string matching.
**Mitigation:** Community review of public registry skills; organisation vetting of org-tier skills.

---

## Threat Actor 2 — MINDFORGE.md governance bypass

**Goal:** Disable governance primitives via MINDFORGE.md settings.
**Attack:** Set `SECRET_DETECTION=false`, `SECURITY_AUTOTRIGGER=false`.
**Controls:**
- Non-overridable rules enforced in CLAUDE.md session start protocol
- MINDFORGE-SCHEMA.json marks these fields as `nonOverridable: true`
- `bin/validate-config.js` warns on attempts to override these fields

**Residual risk:** LOW — enforced at the agent instruction layer, not OS level.
**Note:** An agent that ignores its CLAUDE.md is an agent that ignores everything.

---

## Threat Actor 3 — Accidental credential exposure in project files

**Goal:** Not adversarial — developer accidentally commits a credential.
**Attack vectors:**
- Token pasted into HANDOFF.json
- API key in MINDFORGE.md ADDITIONAL_AGENT_INSTRUCTIONS
- Secret in AUDIT.jsonl via an error message

**Controls:**
- Gate 3 (secret detection) blocks ANY commit with credential patterns
- `_warning` field in every HANDOFF.json schema reminding devs not to store secrets
- Health engine (Category 7) scans .planning/ and root files for credential patterns
- installer-core.js skips .env and *.key files during copyDir

**Residual risk:** LOW — multiple detection layers with complementary coverage.

---

## Threat Actor 4 — TOCTOU attack on skill installation

**Goal:** Replace a valid SKILL.md with malicious content in the window between download and validation.
**Attack:** Race condition in temp directory.
**Controls:**
- `chmod 700` on temp directory (user-only access, blocks other OS users)
- Tarball size check (detects empty/corrupted downloads)
- Download → validate → install is a single-process, single-threaded operation

**Residual risk:** VERY LOW — requires local machine compromise and precise timing.

---

## Threat Actor 5 — Compromised CI environment

**Goal:** Bypass governance gates in CI to ship malicious code.
**Attack:** Modify GitHub Actions workflow or CI runner environment to skip MindForge checks.
**Controls:**
- Gates run as separate CI jobs with explicit dependencies
- Tier 3 changes always fail CI (cannot be configured away)
- AUDIT.jsonl writes all gate results — tampering would require audit log manipulation
- Branch protection rules on the repository (outside MindForge scope)

**Residual risk:** HIGH — an attacker with write access to the workflow file or CI secrets
can bypass. This is a threat to all CI systems, not MindForge specifically.
**Mitigation:** Protect the `main` branch with required status checks.

---

## Threat Actor 6 — SSE event stream eavesdropping

**Goal:** Read sensitive project state from the real-time event stream.
**Attack:** Connect to port 7337 from another local process.
**Controls:**
- localhost-only binding (127.0.0.1) — not accessible from network
- IP address check on every connection — non-localhost rejected with 403
- CORS exact-origin matching (not wildcard)
- Port only opens when the SDK's `MindForgeEventStream.start()` is explicitly called

**Residual risk:** LOW — any process running as the same OS user can connect to localhost.
**Mitigation:** The SSE stream exposes AUDIT entries, not credentials. Risk is information disclosure, not code execution.

---

## Threat Actor 7 — Plugin with elevated or undeclared permissions

**Goal:** Use a MindForge plugin to exfiltrate project state or modify governance.
**Attack:** Install a plugin that reads HANDOFF.json and sends it to an external server.
**Controls:**
- Permission model displayed to user at install time (requires explicit approval)
- Injection guard run against all plugin .md files
- All plugin-triggered actions logged with plugin name as agent in AUDIT.jsonl
- `ELEVATED_PLUGINS` allowlist required for `write_state: true` permission

**Residual risk:** MEDIUM — a user who installs a malicious plugin and approves its permissions.
**Mitigation:** Only install plugins from sources you trust. Review plugin commands before installing.
Treat MindForge plugins like VSCode extensions — they have significant project access.

---

## Controls summary matrix

| Control | Threat Actors Mitigated |
|---|---|
| Injection guard (loader.md) | TA1, TA7 |
| TOCTOU-safe download (chmod 700) | TA1, TA4 |
| Non-overridable governance primitives | TA2 |
| Gate 3 secret detection | TA3 |
| Health engine credential scan | TA3 |
| CI Tier 3 block | TA5 |
| SSE localhost-only binding | TA6 |
| Plugin permission model + AUDIT logging | TA7 |

## Penetration test results

See `docs/security/penetration-test-results.md` for the adversarial review
conducted as part of the v1.0.0 production readiness process.
