# MindForge — AI PR Review Engine

## Purpose
Use the Claude API directly to perform intelligent, contextual code reviews
on pull request diffs. Goes beyond static analysis to provide reasoning-based
feedback that understands architectural context.

## Review philosophy
The AI reviewer has three goals:
1. Catch what static analysis misses (logic errors, design flaws, missing edge cases)
2. Confirm that the PR delivers what it claims (requirements traceability)
3. Maintain code quality standards consistently across all reviewers

The AI reviewer does NOT replace human reviewers — it prepares them.
It surfaces issues, explains context, and asks questions.
Human reviewers make final decisions.

## Claude API integration

```javascript
// pr-review/ai-review-runner.js

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set — AI review unavailable');
  process.exit(0); // Graceful skip, not failure
}

async function runAIReview(diff, context) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: buildSystemPrompt(context),
      messages: [
        { role: 'user', content: buildReviewPrompt(diff, context) }
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
```

## System prompt construction

```javascript
function buildSystemPrompt(context) {
  return `You are a senior code reviewer performing a pull request review for the project: ${context.projectName}.

## Your review context
Tech stack: ${context.techStack}
Architecture pattern: ${context.architecturePattern}
Coding conventions: ${context.conventions}
Security requirements: ${context.securityRequirements}

## Your review approach
1. Read the diff carefully — understand the INTENT of each change, not just the change itself
2. Check if the implementation matches the stated PR purpose
3. Look for: logic errors, missing error handling, security issues, performance concerns
4. Evaluate: code clarity, convention adherence, test coverage
5. Flag: anything that seems to contradict the architecture or conventions

## Output format
Produce a structured review in this exact format:

### Summary
[2-3 sentences: what this PR does and overall quality assessment]

### Findings
For each finding, use exactly:
**[CRITICAL|HIGH|MEDIUM|LOW]** \`file:line\` — [Issue description]
> [Specific recommendation]

### Positive observations
[What was done well — be genuine, not perfunctory]

### Questions for the author
[Numbered questions about unclear decisions or assumptions]

### Verdict
[APPROVE | REQUEST_CHANGES | COMMENT] — [one sentence rationale]

Be direct. Be specific. Cite line numbers. Do not be vague.
Do not flag issues that are stylistic preferences when conventions permit them.
Do not repeat findings from the automated checks (secret detection, type errors) — focus on logic and design.`;
}
```

## Review prompt construction

```javascript
function buildReviewPrompt(diff, context) {
  return `Please review this pull request diff.

## PR Information
Title: ${context.prTitle}
Author: ${context.prAuthor}
Branch: ${context.branch} → ${context.base}
Files changed: ${context.filesChanged}

## Requirements being addressed
${context.requirements || 'No specific requirements listed'}

## Architectural context
${context.architectureContext || 'See ARCHITECTURE.md for system design'}

## The diff
\`\`\`diff
${diff}
\`\`\`

Focus your review on correctness, security, and architectural alignment.
Do not comment on formatting issues handled by the linter.`;
}
```

## Context loading

Before calling the API, load review context:
```javascript
function extractConventionsSections(raw) {
  const sections = [];
  const forbidden = raw.match(/##\s+Forbidden patterns[\s\S]*?(?=\n##\s+|$)/i);
  const naming = raw.match(/##\s+Naming conventions[\s\S]*?(?=\n##\s+|$)/i);
  if (forbidden) sections.push(forbidden[0]);
  if (naming) sections.push(naming[0]);
  return sections.join('\n\n').slice(0, 2000);
}

function loadReviewContext() {
  const projectMd = readFile('.planning/PROJECT.md');
  const archMd    = readFile('.planning/ARCHITECTURE.md');
  const convMd    = readFile('.mindforge/org/CONVENTIONS.md');
  const secMd     = readFile('.mindforge/org/SECURITY.md');

  return {
    projectName:         extractField(projectMd, 'NAME') || 'Unknown',
    techStack:           extractTechStack(projectMd),
    architecturePattern: extractField(archMd, '## Architectural pattern') || 'Unknown',
    conventions:         extractConventionsSections(convMd) || convMd.slice(0, 2000),
    securityRequirements: secMd.slice(0, 1500),
  };
}
```

## Rate limiting and cost management

```javascript
// Review request limits to control API costs
// maxDailyReviews is configurable via MINDFORGE.md: AI_REVIEW_DAILY_LIMIT
const REVIEW_LIMITS = {
  maxDiffSize: 12000,       // Characters — larger diffs get truncated by file
  maxFilesReviewed: 20,     // Review the 20 most-changed files
  cacheTtlMinutes: 60,      // Cache reviews for the same commit SHA
  maxDailyReviews: 50,      // Stop AI reviews after 50 per day (configurable)
};

const AI_REVIEW_LOG = path.join(projectRoot, '.mindforge', 'metrics', 'ai-review-usage.jsonl');

function logAIReview(prSha) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    pr_sha: prSha,
    date: new Date().toISOString().slice(0, 10),
    model: 'claude-sonnet-4-6',
  }) + '\n';

  // Create parent directory if it doesn't exist
  const dir = path.dirname(AI_REVIEW_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.appendFileSync(AI_REVIEW_LOG, entry);
}

// Before calling API: check daily limit
function checkDailyLimit(maxReviews) {
  if (!fs.existsSync(AI_REVIEW_LOG)) return true; // No log = no limit hit

  const today = new Date().toISOString().slice(0, 10);
  let count = 0;

  const lines = fs.readFileSync(AI_REVIEW_LOG, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.date === today) count++;
    } catch {
      continue; // Skip malformed lines — don't let parse errors break the limit check
    }
  }

  return count < maxReviews;
}
```

## Diff truncation strategy (file-based)

```javascript
function buildDiffForReview(fullDiff) {
  const MAX_CHARS = 12000;
  const MAX_FILES = 20;

  if (fullDiff.length <= MAX_CHARS) return fullDiff;

  // Prefer showing fewer complete files over more truncated ones
  // Sort files by change size (largest first — most important to review)
  const fileDiffs = splitDiffByFile(fullDiff);
  const sortedFiles = fileDiffs.sort((a, b) => b.content.length - a.content.length);

  let result = '';
  let fileCount = 0;
  for (const fileDiff of sortedFiles.slice(0, MAX_FILES)) {
    if (result.length + fileDiff.content.length > MAX_CHARS) break;
    result += fileDiff.content + '\n';
    fileCount++;
  }

  const omitted = sortedFiles.length - fileCount;
  if (omitted > 0) {
    result += `\n[${omitted} file(s) omitted from review — diff too large. Run review with --diff on individual files.]\n`;
  }

  return result;
}

function splitDiffByFile(diff) {
  const files = [];
  const parts = diff.split(/^diff --git/m).filter(Boolean);
  for (const part of parts) {
    const header = part.match(/^a\/(.+) b\//);
    files.push({
      filename: header ? header[1] : 'unknown',
      content: 'diff --git' + part,
    });
  }
  return files;
}
```

## Output formatting for GitHub

```javascript
function formatForGitHub(aiReview, summary) {
  return `## 🤖 MindForge AI Code Review

${aiReview}

---
*Generated by MindForge AI Review Engine v${VERSION}*
*Model: claude-sonnet-4-6 | Context: PROJECT.md + ARCHITECTURE.md + CONVENTIONS.md*
*This review supplements but does not replace human code review.*`;
}
```
