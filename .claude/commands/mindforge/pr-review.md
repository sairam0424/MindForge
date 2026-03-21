# MindForge — PR Review Command
# Usage: /mindforge:pr-review [--diff path] [--sha base..head] [--output github|json|markdown]

Run the AI PR review engine on a pull request diff.

Steps:
1. Determine diff source:
   - `--diff path`: read diff from file
   - `--sha base..head`: run `git diff base..head`
   - Default: `git diff HEAD~1` (last commit) or `git diff --staged` (staged changes)

2. Load review context (per ai-reviewer.md):
   - PROJECT.md, ARCHITECTURE.md, CONVENTIONS.md, SECURITY.md
   - Current phase's CONTEXT.md (if in an active phase)
   - Any active ADRs relevant to changed files

3. Detect change type and select review template:
   - Auth/security changes → Security-focused review template
   - Database migrations → Database migration review template
   - API changes → API breaking change review template
   - Default → Standard review template

4. Check API availability:
   - ANTHROPIC_API_KEY set? If not: warn and skip AI review
   - Check daily review limit (from ai-reviewer.md)
   - Check cache: has this SHA been reviewed in the last 60 minutes?

5. Call Claude API (per ai-reviewer.md buildSystemPrompt + buildReviewPrompt)
   - Handle errors gracefully — API unavailable is NOT a build failure
   - Timeout: 60 seconds

6. Format output per --output flag:
   - github: GitHub-flavoured markdown for PR comment
   - json: structured JSON with findings array
   - markdown: standard markdown

7. Write to output:
   - If in CI: write to /tmp/mindforge-review.md (read by GitHub Actions step)
   - If interactive: display to user

8. Write AUDIT entry
