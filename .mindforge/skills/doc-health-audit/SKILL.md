---
name: doc-health-audit
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: documentation audit, doc health, stale docs, outdated documentation, README outdated, doc maintenance, documentation drift, claim validation, doc review, doc coverage, broken links
compose:
  - documentation
---

# Skill — Documentation Health Audit

## When this skill activates
When reviewing documentation quality, checking for staleness, validating
code references in docs, or performing periodic maintenance on project documentation.

## Mandatory actions when this skill is active

### Before auditing
1. Identify all documentation files in the project (README, docs/, CHANGELOG, API docs, etc.)
2. Note the last modification date of each doc file
3. Note recent code changes that SHOULD have triggered doc updates

### The 5-Point Health Check

**1. Claim Validation**
For every factual claim in docs (code examples, API signatures, file paths):
- Verify the referenced code/file ACTUALLY EXISTS
- Verify code examples COMPILE and RUN correctly
- Verify API signatures match current implementation
- Flag any claim that cannot be verified as "UNVERIFIED"

**2. Staleness Detection**
A doc is STALE if:
- Code it references has changed since the doc was last updated
- More than 20 commits have touched referenced files without doc update
- It references deprecated APIs, removed features, or old patterns
- Version numbers or counts are outdated

**3. Coverage Gaps**
Check for undocumented areas:
- Public APIs without usage examples
- Features without user-facing documentation
- Error codes without explanation
- Configuration options without description
- New files/modules without architectural context

**4. Consistency Check**
Across all docs, verify:
- Version numbers are consistent (README vs package.json vs CHANGELOG)
- Naming is consistent (same feature called the same thing everywhere)
- Instructions don't contradict each other
- Links between docs are not broken (internal cross-references)

**5. Maintenance Scoring**
Score each doc file 0-10:
- 9-10: Current, accurate, comprehensive
- 6-8: Minor issues (outdated example, missing edge case)
- 3-5: Significant staleness (multiple outdated references)
- 0-2: Dangerously outdated (actively misleading)

### Output Format

Write to `.planning/DOC-HEALTH-REPORT-[timestamp].md`:
```markdown
# Documentation Health Report
Date: [timestamp]
Files audited: [count]
Overall score: [average across all files]

## Critical Findings (score 0-2)
| File | Issue | Impact |
...

## Stale Docs (score 3-5)
| File | Last Updated | Code Changes Since | Top Issue |
...

## Healthy Docs (score 6+)
| File | Score | Minor Issues |
...

## Coverage Gaps
- [undocumented area 1]
- [undocumented area 2]

## Recommendations (prioritized)
1. [highest impact fix]
2. ...
```

### After audit
- Create action items for all Critical findings (score 0-2)
- Suggest specific fixes for Stale docs
- Log audit summary in AUDIT
- Consider: should any finding become an instinct? (e.g., "always update README when adding new commands")

## Self-check before task completion
- [ ] Did I verify code references in docs actually exist?
- [ ] Did I check code examples compile/run correctly?
- [ ] Did I produce a DOC-HEALTH-REPORT with per-file scores?
- [ ] Did I create action items for any Critical findings (score 0-2)?
