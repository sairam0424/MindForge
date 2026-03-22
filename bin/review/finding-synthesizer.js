/**
 * MindForge v2 — Finding Synthesizer
 * Identifies consensus, model-specific issues, and contradictions.
 */
'use strict';

const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

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

  // Detect consensus
  const consensus = [];
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
    }
  }

  // Detect contradictions (large severity gap on same finding)
  const contradictions = [];
  // (In a real implementation, we'd more deeply analyze conflicting logic)

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
