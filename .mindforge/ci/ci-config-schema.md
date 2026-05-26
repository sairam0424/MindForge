# MindForge CI Config Schema

## Purpose
Document CI-related configuration keys supported in `MINDFORGE.md`.

## Supported keys

| Key | Type | Default | Description |
|---|---|---|---|
| `CI_EXECUTE_PHASES` | string | `all` | Phases to run in CI (`all` or comma-separated list) |
| `CI_AUTO_APPROVE_TIER2` | boolean | `false` | Auto-approve Tier 2 changes in CI |
| `CI_BLOCK_ON_MEDIUM_SECURITY` | boolean | `false` | Block CI on MEDIUM security findings |
| `CI_SECURITY_SCAN` | boolean | `true` | Run security scan in CI |
| `CI_SKIP_UAT` | boolean | `true` | Skip human UAT in CI |
| `CI_MIN_COVERAGE_PCT` | number | `80` | Coverage threshold for CI |
| `CI_TIMEOUT_MINUTES` | number | `60` | Total CI timeout in minutes |
| `CI_OUTPUT_FORMAT` | enum | `github-annotations` | Output format: json, text, github-annotations |

## Notes
- CI defaults are safety-first. Tier 2 is blocked unless explicitly auto-approved.
- Tier 3 is always blocked in CI regardless of configuration.
