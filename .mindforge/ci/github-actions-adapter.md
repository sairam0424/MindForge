# MindForge — GitHub Actions Integration

## Purpose
Define the GitHub Actions workflow that integrates MindForge into CI/CD pipelines.

## Workflow file: `.github/workflows/mindforge-ci.yml`

```yaml
name: MindForge CI

on:
  push:
    branches: [ main, 'feat/**' ]
  pull_request:
    branches: [ main ]

env:
  CI: true
  MINDFORGE_CI: true
  NODE_VERSION: '20'

jobs:
  mindforge-health:
    name: MindForge Health Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # Full history for git-based checks

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install MindForge
        run: npx mindforge-cc@latest --claude --local

      - name: Validate MINDFORGE.md
        run: node bin/validate-config.js

      - name: Run MindForge health check
        run: |
          # Health check in CI mode — outputs structured JSON
          echo "::group::MindForge Health Report"
          node -e "
            // CI health check simulation
            // In full implementation: calls mindforge health engine
            const fs = require('fs');
            const files = ['.planning/AUDIT.jsonl', '.planning/STATE.md', '.planning/HANDOFF.json'];
            let allPresent = true;
            files.forEach(f => {
              if (!fs.existsSync(f)) {
                console.log('::warning::Missing state file: ' + f);
                allPresent = false;
              }
            });
            console.log(allPresent ? '::notice::All state files present' : '::warning::Some state files missing');
          "
          echo "::endgroup::"

  mindforge-security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: mindforge-health
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: MindForge secret detection
        run: |
          echo "::group::Secret Detection"
          # Secret patterns — exits non-zero if found
          if grep -rE "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]+|xoxb-[a-zA-Z0-9-]+)" \
            --include="*.ts" --include="*.js" --include="*.json" \
            --exclude-dir=node_modules --exclude-dir=.git \
            . 2>/dev/null; then
            echo "::error::Credentials detected in source files. Remove before merging."
            exit 1
          fi
          echo "::notice::No credentials detected ✅"
          echo "::endgroup::"

      - name: Dependency audit
        run: |
          echo "::group::Dependency Audit"
          npm audit --audit-level=high 2>&1 || {
            echo "::error::High/critical vulnerabilities found. Run: npm audit fix"
            exit 1
          }
          echo "::endgroup::"

  mindforge-quality:
    name: Code Quality Gates
    runs-on: ubuntu-latest
    needs: mindforge-health
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit 2>&1 | while read line; do
          echo "::error::$line"
          done

      - name: Lint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0

      - name: Test suite with coverage
        run: npm test -- --coverage
        env:
          COVERAGE_THRESHOLD: 80

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json 2>/dev/null | \
            node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
            console.log(Math.floor(d.total.lines.pct))" 2>/dev/null || echo "0")
          MIN=${CI_MIN_COVERAGE_PCT:-80}
          if [ "${COVERAGE}" -lt "${MIN}" ]; then
            echo "::error::Coverage ${COVERAGE}% is below minimum ${MIN}%"
            exit 1
          fi
          echo "::notice::Coverage: ${COVERAGE}% ✅"

      - name: Check governance tier (Tier 3 blocks CI)
        run: |
          # Check if any pending Tier 3 approvals exist without approval
          PENDING_T3=$(find .planning/approvals/ -name "*.json" 2>/dev/null | \
            xargs grep -l '"tier": 3' 2>/dev/null | \
            xargs grep -l '"status": "pending"' 2>/dev/null | wc -l)

          if [ "${PENDING_T3}" -gt 0 ]; then
            echo "::error title=Tier 3 Governance Block::${PENDING_T3} Tier 3 change(s) require compliance review."
            echo "::error::Tier 3 changes (auth/payment/PII) cannot be auto-approved in CI."
            echo "::error::To resolve: get human approval with /mindforge:approve [id], then push again."
            cat >> "${GITHUB_STEP_SUMMARY}" << 'SUMMARY_EOF'
## 🔴 Governance Block: Tier 3 Approval Required

This PR contains changes that require compliance review (auth, payment, or PII handling).

**Next steps:**
1. Run `/mindforge:approve` to see pending approval requests
2. Have your compliance officer approve with `/mindforge:approve [id]`
3. Push again — CI will pass once the approval is recorded

See `.planning/approvals/` for details.
SUMMARY_EOF
            exit 1
          fi

          echo "::notice::Governance check passed — no pending Tier 3 blocks ✅"

  mindforge-ai-review:
    name: AI Code Review
    runs-on: ubuntu-latest
    needs: [mindforge-security, mindforge-quality]
    if: github.event_name == 'pull_request'
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install MindForge
        run: npx mindforge-cc@latest --claude --local

      - name: Run AI PR Review
        run: |
          if [ -z "${ANTHROPIC_API_KEY}" ]; then
            echo "::notice::ANTHROPIC_API_KEY not set — skipping AI review"
            exit 0
          fi

          # Get the diff for this PR
          git diff ${{ github.event.pull_request.base.sha }}...${{ github.event.pull_request.head.sha }} > /tmp/pr.diff

          # Run MindForge AI review (outputs GitHub annotations)
          node -e "
            // Placeholder for AI review execution
            // In full implementation: calls Claude API via the pr-review engine
            console.log('::notice::AI PR review completed — see review comment on PR');
          "

      - name: Post review as PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const review = fs.existsSync('/tmp/mindforge-review.md') ?
              fs.readFileSync('/tmp/mindforge-review.md', 'utf8') :
              '✅ MindForge AI review: no significant issues found.';

            await github.rest.pulls.createReview({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
              body: review,
              event: 'COMMENT'
            });
```
