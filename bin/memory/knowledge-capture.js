/**
 * MindForge v2.4.0 — Knowledge Capture Engine (RAG 2.0)
 * Automatically extracts and stores knowledge from MindForge lifecycle events.
 * Extended with graph-aware edge creation for the Knowledge Graph.
 */
'use strict';

const fs       = require('fs');
const path     = require('path');
const Store    = require('./knowledge-store');
const Indexer  = require('./knowledge-indexer');
const Graph    = require('./knowledge-graph');
const Embedder = require('./embedding-engine');
const PillarHealth = require('./pillar-health-tracker');

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
        // Reinforce graph edges too
        reinforceRelatedEdges(e.id);
        return { action: 'reinforced', id: e.id };
      } else {
        // New entry has higher confidence — supersede old
        Store.deprecate(e.id, 'Superseded by higher-confidence entry', null);
      }
    }
  }

  const id = Store.add(entry);

  // RAG 2.0: Auto-create graph edges for the new entry
  autoLinkEntry(id, entry);

  return { action: 'added', id };
}

/**
 * Auto-link a newly added entry to the knowledge graph.
 * Builds embeddings and creates RELATED_TO edges for high-similarity matches.
 * @param {string} entryId
 * @param {object} entry
 */
function autoLinkEntry(entryId, entry) {
  try {
    const allEntries = Store.readAll();
    if (allEntries.length < 2) return; // Need at least 2 entries

    const { vectors } = Embedder.buildEmbeddings(allEntries);
    const created = Graph.autoCreateEdges(entryId, vectors);

    if (created.length > 0) {
      // If this is a bug_pattern, also create CAUSED_BY edges to related code_patterns
      if (entry.type === 'bug_pattern') {
        createCausalEdges(entryId, allEntries, vectors);
      }

      // If this is an architectural_decision, create INFORMS edges
      if (entry.type === 'architectural_decision') {
        createInformsEdges(entryId, allEntries, vectors);
      }
    }
  } catch (err) {
    // Never crash the capture pipeline for graph errors
    if (process.env.MINDFORGE_DEBUG) {
      console.error('[RAG 2.0] Auto-link error:', err.message);
    }
  }
}

/**
 * Create CAUSED_BY edges from bug patterns to related code patterns.
 * @param {string} bugId
 * @param {object[]} allEntries
 * @param {Map} vectors
 */
function createCausalEdges(bugId, allEntries, vectors) {
  const codePatterns = allEntries.filter(e => e.type === 'code_pattern' && !e.deprecated);
  const bugVec = vectors.get(bugId);
  if (!bugVec) return;

  for (const cp of codePatterns) {
    const cpVec = vectors.get(cp.id);
    if (!cpVec) continue;

    const sim = Embedder.cosineSimilarity(bugVec, cpVec);
    if (sim >= 0.50) {
      try {
        Graph.addEdge({
          sourceId: bugId,
          targetId: cp.id,
          type: Graph.EDGE_TYPES.CAUSED_BY,
          weight: sim,
          reason: `Bug pattern potentially caused by code pattern (sim: ${sim.toFixed(3)})`,
        });
      } catch { /* skip duplicates or self-refs */ }
    }
  }
}

/**
 * Create INFORMS edges from architectural decisions to domain knowledge.
 * @param {string} decisionId
 * @param {object[]} allEntries
 * @param {Map} vectors
 */
function createInformsEdges(decisionId, allEntries, vectors) {
  const domainEntries = allEntries.filter(e =>
    (e.type === 'domain_knowledge' || e.type === 'team_preference') && !e.deprecated
  );
  const decVec = vectors.get(decisionId);
  if (!decVec) return;

  for (const de of domainEntries) {
    const deVec = vectors.get(de.id);
    if (!deVec) continue;

    const sim = Embedder.cosineSimilarity(decVec, deVec);
    if (sim >= 0.55) {
      try {
        Graph.addEdge({
          sourceId: decisionId,
          targetId: de.id,
          type: Graph.EDGE_TYPES.INFORMS,
          weight: sim,
          reason: `Decision informs domain knowledge (sim: ${sim.toFixed(3)})`,
        });
      } catch { /* skip duplicates or self-refs */ }
    }
  }
}

/**
 * Reinforce graph edges connected to a reinforced node.
 * @param {string} nodeId
 */
function reinforceRelatedEdges(nodeId) {
  try {
    const edges = Graph.getNodeEdges(nodeId);
    for (const edge of edges.slice(0, 3)) { // Top 3 edges only
      Graph.reinforceEdge(edge.id);
    }
  } catch { /* non-critical */ }
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

  let handoff;
  try {
    handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
  } catch (err) {
    // Malformed handoff.json must not crash the capture pipeline — mirror the
    // missing-file path and return [] after logging the parse failure.
    console.error(`[knowledge-capture] Failed to parse handoff file ${handoffPath}: ${err.message}`);
    return [];
  }

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

/**
 * Capture architectural stability from audit traces.
 */
function captureArchitecturalStability(phaseNum) {
  const auditPath = path.join(PLANNING_DIR, 'AUDIT.jsonl');
  if (!fs.existsSync(auditPath)) return [];

  const summary = PillarHealth.summarizePhase(auditPath);
  if (!summary) return [];

  const project = getProjectName();
  const captured = [];

  // 1. Capture overall health
  const healthResult = deduplicateOrAdd({
    type: 'pillar_health',
    topic: `Phase ${phaseNum} Architectural Health`,
    content: `RSA Alignment: ${summary.avgRsa}\nIDC Upgrades: ${summary.idcCount}`,
    source: `PillarHealth Analysis (Phase ${phaseNum})`,
    project,
    confidence: 1.0,
    rsa_avg: summary.avgRsa,
    idc_avg: summary.idcCount,
  });
  captured.push(healthResult);

  // 2. Capture stability patterns (Homing signals)
  const templates = PillarHealth.getHighEfficacyTemplates(summary.stabilityPatterns);
  for (const t of templates) {
    const res = deduplicateOrAdd({
      type: 'stability_pattern',
      topic: `${t.req_id} Alignment Recovery`,
      content: `Synthesized refocus instruction: ${t.instruction}`,
      source: `SCS Synthesis (Phase ${phaseNum})`,
      project,
      confidence: t.efficacy,
      req_id: t.req_id,
      efficacy_score: t.efficacy,
    });
    captured.push(res);
  }

  return captured;
}

module.exports = {
  captureFromPhaseCompletion,
  captureFromCompaction,
  captureFromDebugReport,
  captureFromRetrospective,
  captureFromCrossReview,
  captureArchitecturalStability,
  deduplicateOrAdd,
  inferTagsFromText,
  inferBugCategory,
};
