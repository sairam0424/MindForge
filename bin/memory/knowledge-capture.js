/**
 * MindForge v2 — Knowledge Capture Engine
 * Automatically extracts and stores knowledge from MindForge lifecycle events.
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const Store  = require('./knowledge-store');
const Indexer = require('./knowledge-indexer');

const PLANNING_DIR = path.join(process.cwd(), '.planning');
const DECISIONS_DIR = path.join(PLANNING_DIR, 'decisions');

// ── Capture helpers ───────────────────────────────────────────────────────────

function getProjectName() {
  const projectMd = path.join(PLANNING_DIR, 'PROJECT.md');
  if (!fs.existsSync(projectMd)) return 'unknown';
  const match = fs.readFileSync(projectMd, 'utf8').match(/^# (.+)/m);
  return match?.[1]?.trim().slice(0, 50) || 'unknown';
}

function inferTagsFromText(text) {
  const DOMAIN_TAGS = {
    auth:        /auth|login|logout|jwt|token|session|password|bcrypt|argon/i,
    database:    /database|sql|query|migration|prisma|drizzle|postgres|mysql|mongo/i,
    api:         /api|endpoint|route|rest|graphql|webhook|request|response/i,
    security:    /security|owasp|xss|csrf|injection|vulnerability|encryption/i,
    performance: /performance|cache|cdn|lazy|async|concurrent|throttle|debounce/i,
    testing:     /test|spec|mock|stub|fixture|coverage|jest|vitest|playwright/i,
    ui:          /component|react|vue|svelte|css|style|render|layout/i,
    infra:       /docker|kubernetes|ci|deploy|environment|config|env/i,
  };

  const tags = [];
  for (const [tag, pattern] of Object.entries(DOMAIN_TAGS)) {
    if (pattern.test(text)) tags.push(tag);
  }
  return tags;
}

function deduplicateOrAdd(entry) {
  const existing = Indexer.search(`${entry.topic} ${entry.content}`, {
    type: entry.type,
    minConfidence: 0.0,
    includeGlobal: false,
  }, 3);

  // Check if we have a near-duplicate
  for (const e of existing) {
    if (!e.deprecated && e.id) {
      // High similarity — reinforce instead of duplicate
      if (e.confidence >= entry.confidence) {
        Store.reinforce(e.id);
        return { action: 'reinforced', id: e.id };
      } else {
        // New entry has higher confidence — supersede old
        Store.deprecate(e.id, `Superseded by higher-confidence entry`, null);
      }
    }
  }

  const id = Store.add(entry);
  return { action: 'added', id };
}

// ── Event-specific capture functions ─────────────────────────────────────────

/**
 * Capture architectural decisions from ADR files after phase completion.
 */
function captureFromPhaseCompletion(phaseNum) {
  if (!fs.existsSync(DECISIONS_DIR)) return [];

  const captured = [];
  const project  = getProjectName();

  const adrFiles = fs.readdirSync(DECISIONS_DIR)
    .filter(f => f.startsWith('ADR-') && f.endsWith('.md'))
    .sort();

  for (const adrFile of adrFiles) {
    const filePath = path.join(DECISIONS_DIR, adrFile);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract decision content
    const titleMatch   = content.match(/^# ADR-\d+: (.+)/m);
    const decision     = (content.match(/## Decision\n+([\s\S]*?)(?=\n##)/)?.[1] || '').trim().slice(0, 500);
    const rationale    = (content.match(/## Rationale\n+([\s\S]*?)(?=\n##)/)?.[1] || '').trim().slice(0, 500);
    const status       = (content.match(/\*\*Status:\*\*\s*(.+)/)?.[1] || 'Unknown').trim();

    if (!decision || status === 'Superseded') continue;

    const topic = titleMatch?.[1]?.trim() || adrFile.replace('.md', '');

    const result = deduplicateOrAdd({
      type:          'architectural_decision',
      topic:         topic.slice(0, 80),
      content:       `${decision}\n\nRationale: ${rationale}`,
      source:        `${adrFile} (Phase ${phaseNum})`,
      project,
      confidence:    0.90,
      tags:          inferTagsFromText(content),
      linked_adrs:   [adrFile.replace('.md', '')],
      adr_reference: adrFile.replace('.md', ''),
      decision,
      rationale,
    });

    captured.push({ file: adrFile, ...result });
  }

  return captured;
}

/**
 * Capture domain knowledge from smart compaction Block D (implicit knowledge).
 */
function captureFromCompaction(handoffPath) {
  if (!fs.existsSync(handoffPath)) return [];

  const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
  const items   = handoff.implicit_knowledge || [];
  const project = getProjectName();
  const captured = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    const confidence = item.confidence ?? 0.5;
    if (confidence < 0.5) continue; // Skip low-confidence items

    const result = deduplicateOrAdd({
      type:       'domain_knowledge',
      topic:      item.topic || item.text?.slice(0, 80) || 'Unknown topic',
      content:    item.content || item.text || String(item),
      source:     'Smart compaction Block D',
      project,
      confidence: confidence * 0.9, // Slight discount for auto-captured
      tags:       inferTagsFromText(item.content || item.text || ''),
    });

    captured.push(result);
  }

  return captured;
}

/**
 * Capture bug patterns from debug reports.
 */
function captureFromDebugReport(debugReportPath) {
  if (!fs.existsSync(debugReportPath)) return null;

  const content = fs.readFileSync(debugReportPath, 'utf8');
  const project = getProjectName();

  const rootCause = (content.match(/## Root [Cc]ause\n+([\s\S]*?)(?=\n##)/)?.[1] || '').trim();
  const fix       = (content.match(/## Fix\n+([\s\S]*?)(?=\n##)/)?.[1] || '').trim();
  const title     = (content.match(/^# Debug[:\s]+(.+)/m)?.[1] || 'Unknown bug').trim();

  if (!rootCause) return null;

  const result = deduplicateOrAdd({
    type:        'bug_pattern',
    topic:       title.slice(0, 80),
    content:     `Root cause: ${rootCause}\n\nFix: ${fix}`,
    source:      `Debug session: ${path.basename(debugReportPath)}`,
    project,
    confidence:  0.80,
    tags:        inferTagsFromText(content),
    bug_category: inferBugCategory(content),
    root_cause:  rootCause.slice(0, 500),
    fix:         fix.slice(0, 500),
  });

  return result;
}

/**
 * Capture team preferences from retrospective reports.
 */
function captureFromRetrospective(retroReportPath) {
  if (!fs.existsSync(retroReportPath)) return [];

  const content = fs.readFileSync(retroReportPath, 'utf8');
  const project = getProjectName();
  const captured = [];

  // Extract "keep doing" items (positive practices)
  const keepSection = content.match(/## (Keep|What (?:we )?should we keep|Plus|Went well)\n+([\s\S]*?)(?=\n##)/i);
  if (keepSection) {
    const items = keepSection[2].split('\n')
      .filter(l => l.startsWith('- ') || l.startsWith('* '))
      .map(l => l.replace(/^[-*]\s+/, '').trim())
      .filter(l => l.length > 20); // Skip trivial items

    for (const item of items.slice(0, 5)) {
      const result = deduplicateOrAdd({
        type:        'team_preference',
        topic:       item.slice(0, 80),
        content:     item,
        source:      `Retrospective: ${path.basename(retroReportPath)}`,
        project,
        confidence:  0.70,
        tags:        inferTagsFromText(item),
        preference:  item,
        strength:    'moderate',
        preference_type: 'process',
      });
      captured.push(result);
    }
  }

  return captured;
}

/**
 * Capture from cross-review consensus findings.
 */
function captureFromCrossReview(crossReviewPath) {
  if (!fs.existsSync(crossReviewPath)) return [];

  const content = fs.readFileSync(crossReviewPath, 'utf8');
  const project = getProjectName();
  const captured = [];

  // Extract consensus findings table rows
  const tableRows = content.match(/\|\s*\d+\s*\|\s*\*\*\w+\*\*\s*\|.+/g) || [];

  for (const row of tableRows.slice(0, 10)) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;

    const severity    = cells[1]?.replace(/\*\*/g, '') || 'MEDIUM';
    const description = cells[2] || '';
    if (description.length < 20) continue;

    const result = deduplicateOrAdd({
      type:        'bug_pattern',
      topic:       description.slice(0, 80),
      content:     description,
      source:      `Cross-review consensus: ${path.basename(crossReviewPath)}`,
      project,
      confidence:  0.80,
      tags:        [...inferTagsFromText(description), 'security'],
      bug_category: 'security',
      root_cause:  description,
      severity_when_missed: severity,
    });

    captured.push(result);
  }

  return captured;
}

function inferBugCategory(text) {
  if (/auth|login|session|jwt|token|password/i.test(text)) return 'auth';
  if (/sql|database|query|migration/i.test(text))           return 'database';
  if (/api|endpoint|route|request/i.test(text))             return 'api';
  if (/ui|component|render|css/i.test(text))                return 'ui';
  if (/performance|slow|timeout/i.test(text))               return 'performance';
  if (/security|xss|injection|csrf/i.test(text))            return 'security';
  return 'general';
}

module.exports = {
  captureFromPhaseCompletion,
  captureFromCompaction,
  captureFromDebugReport,
  captureFromRetrospective,
  captureFromCrossReview,
  deduplicateOrAdd,
  inferTagsFromText,
  inferBugCategory,
};
