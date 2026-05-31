/**
 * MindForge v2 — Finding Synthesizer
 * Identifies consensus, model-specific issues, and contradictions.
 */
'use strict';

const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// A severity spread of this many levels (or more) within a single location-group
// is treated as a contradiction (e.g. CRITICAL=3 vs LOW=0 → gap 3).
const CONTRADICTION_GAP_THRESHOLD = 2;

function synthesizeFindings(reviews) {
  const allFindings = [];
  const modelSpecific = {};

  for (const review of reviews) {
    const findings = parseFindings(review.content);
    modelSpecific[review.model] = findings;
    for (const f of findings) {
      allFindings.push({ ...f, model: review.model });
    }
  }

  // Detect consensus and contradictions from the same location-groups.
  const consensus = [];
  const contradictions = [];
  const processed = new Set();

  for (let i = 0; i < allFindings.length; i++) {
    if (processed.has(i)) continue;
    const f1 = allFindings[i];
    const group = [f1];
    processed.add(i);

    for (let j = i + 1; j < allFindings.length; j++) {
      if (processed.has(j)) continue;
      const f2 = allFindings[j];

      if (isSameFinding(f1, f2)) {
        group.push(f2);
        processed.add(j);
      }
    }

    if (group.length >= 2) {
      consensus.push({
        location: f1.location,
        description: f1.description,
        severity: getHighestSeverity(group.map(f => f.severity)),
        models: group.map(f => f.model),
      });

      const contradiction = detectContradiction(f1.location, group);
      if (contradiction) contradictions.push(contradiction);
    }
  }

  return {
    consensus,
    model_specific: modelSpecific,
    contradictions,
    total_findings: allFindings.length,
    critical_count: allFindings.filter(f => f.severity === 'CRITICAL').length,
    overall_verdict: getOverallVerdict(reviews.map(r => extractVerdict(r.content)))
  };
}

function parseFindings(text) {
  const findings = [];
  // Simple regex-based parser for the [SEVERITY] location - description format
  const regex = /\*\*\[(LOW|MEDIUM|HIGH|CRITICAL)\]\*\* `([^`]+)` — ([^\n]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    findings.push({
      severity: match[1],
      location: match[2],
      description: match[3].trim()
    });
  }
  return findings;
}

function isSameFinding(f1, f2) {
  const loc1 = normalizeLocation(f1.location);
  const loc2 = normalizeLocation(f2.location);
  return loc1 === loc2;
}

function normalizeLocation(loc) {
  if (!loc) return '';
  // Fuzzy match on line numbers using 20-line band
  return loc.toLowerCase().replace(/:(\d+)$/, (_, n) => {
    const band = Math.round(parseInt(n, 10) / 20) * 20;
    return `:${band}`;
  });
}

function severityRank(severity) {
  const idx = SEVERITY_ORDER.indexOf(severity);
  return idx < 0 ? 0 : idx;
}

// A location-group is contradictory when its reviews disagree on severity by
// CONTRADICTION_GAP_THRESHOLD levels or more (e.g. CRITICAL vs LOW). Reuses the
// already-computed location-group rather than re-deriving it.
function detectContradiction(location, group) {
  const ranks = group.map(f => severityRank(f.severity));
  const maxRank = Math.max(...ranks);
  const minRank = Math.min(...ranks);

  if (maxRank - minRank < CONTRADICTION_GAP_THRESHOLD) return null;

  return {
    location,
    severities: group.map(f => f.severity),
    models: group.map(f => f.model),
    description: `Severity disagreement at ${location}: ` +
      `${SEVERITY_ORDER[minRank]} vs ${SEVERITY_ORDER[maxRank]} ` +
      `(${maxRank - minRank}-level gap across ${group.length} reviews)`,
  };
}

function getHighestSeverity(severities) {
  let highest = 0;
  for (const s of severities) {
    const idx = SEVERITY_ORDER.indexOf(s);
    if (idx > highest) highest = idx;
  }
  return SEVERITY_ORDER[highest];
}

function extractVerdict(text) {
  if (text.includes('### Verdict: APPROVE')) return 'APPROVE';
  if (text.includes('### Verdict: REQUEST_CHANGES')) return 'REQUEST_CHANGES';
  return 'COMMENT';
}

function getOverallVerdict(verdicts) {
  if (verdicts.includes('REQUEST_CHANGES')) return 'REQUEST_CHANGES';
  if (verdicts.every(v => v === 'APPROVE')) return 'APPROVE';
  return 'COMMENT';
}

module.exports = { synthesizeFindings, parseFindings, extractVerdict };
