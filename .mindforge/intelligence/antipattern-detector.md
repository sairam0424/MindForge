# MindForge Intelligence — Anti-Pattern Detection Engine

## Purpose
Detect architecture, database, security, code-quality, and testing anti-patterns
at plan, execute, and review checkpoints.

## Key patterns
- A01 God object / service
- A02 Circular dependencies
- A03 Distributed monolith
- A04 Hardcoded configuration
- B01 `SELECT *`
- B02 Missing FK indexes
- B03 Unbounded queries
- C01 Auth bypass via type coercion
- C02 Missing authorization
- C03 Sensitive data in URL
- D01 Callback/pyramid complexity
- D02 Magic strings
- D03 Swallowed errors
- E01 Tests tied to internals
- E02 Flaky test indicators

## C01 false positive prevention
Exclude from C01 scanning:
```bash
grep -rn "==\s*null\|==\s*undefined\|==\s*false\|==\s*0" src/ \
  --include="*.ts" --include="*.js" \
  --exclude="*.test.ts" --exclude="*.spec.ts" --exclude="*.test.js" --exclude="*.spec.js"
```

Do not flag:
- assertions in test files (`tests/**`, `*.test.*`, `*.spec.*`)
- intentional type-guard nullish checks (`x == null`) in type-guard functions

Only treat C01 as critical in auth/middleware/security-sensitive paths.

## B03 cursor pagination exception
Cursor-based pagination is exempt from unbounded query check.
Recognize exemptions:
- Prisma `cursor:` parameter
- query with both `orderBy:` and `cursor:`
- SQL tuple cursor predicates (`WHERE (..., ...) < (..., ...)`)

```bash
grep -rn "findMany\\b" src/ --include="*.ts" | python3 - <<'PY'
import sys
for line in sys.stdin:
    l = line.lower()
    if 'cursor:' in l or '< :cursor' in l or '<(' in l:
        continue
    if 'take:' not in l and 'limit:' not in l:
        print('B03 candidate:', line.strip())
PY
```

## D01 executable line counting
Use executable-line heuristic for God-object thresholding, not raw `wc -l`.

```bash
count_executable_lines() {
  local f="$1"
  grep -v '^\s*$' "$f" | grep -v '^\s*//' | grep -v '^\s*\*' | grep -v '^\s*@' | wc -l
}
```

Apply threshold to executable count (e.g., `>500`) plus dependency fan-in signal.

## Trigger points
- Plan phase: architecture patterns (A*)
- Execute phase: implementation/security patterns (B*, C*, D03)
- Review phase: full library

## Report format
Include id, severity, location, and exact remediation advice.
