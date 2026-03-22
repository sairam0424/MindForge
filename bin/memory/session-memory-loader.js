/**
 * MindForge v2 — Session Memory Loader
 * Loads relevant knowledge at session start and formats it for CLAUDE.md injection.
 *
 * Called at session boot to populate the agent with accumulated knowledge
 * before any task begins.
 */
'use strict';

const fs      = require('fs');
const path    = require('path');
const Indexer = require('./knowledge-indexer');
const Store   = require('./knowledge-store');

/**
 * Load relevant session context from the knowledge graph.
 * Returns a formatted string for injection into agent context at session start.
 *
 * @param {object} opts
 * @param {string[]} opts.techStack  - Tech stack from PROJECT.md (for relevance filtering)
 * @param {string}   opts.phase      - Current phase description
 * @param {string}   opts.topic      - Current task/topic focus
 * @param {number}   opts.maxEntries - Maximum entries to load (default: 20)
 */
function loadForSession(opts = {}) {
  const { techStack = [], phase = '', topic = '', maxEntries = 20 } = opts;

  const context = Indexer.loadSessionContext({ techStack, phase, topic });
  const allLoaded = [
    ...context.preferences,
    ...context.decisions,
    ...context.bugPatterns,
    ...context.codePatterns,
    ...context.domain,
  ];

  if (allLoaded.length === 0) {
    return { formatted: '', entries: [], count: 0 };
  }

  // Reinforce all loaded entries (they are being actively used)
  for (const entry of allLoaded) {
    try { Store.reinforce(entry.id); } catch { /* ignore reinforce failures */ }
  }

  const formatted = formatForContext(context);

  return {
    formatted,
    entries:     allLoaded,
    count:       allLoaded.length,
    preferences: context.preferences.length,
    decisions:   context.decisions.length,
    bugPatterns: context.bugPatterns.length,
    codePatterns: context.codePatterns.length,
    domain:      context.domain.length,
  };
}

/**
 * Format loaded knowledge entries for agent context injection.
 */
function formatForContext(context) {
  const sections = [];

  if (context.preferences.length > 0) {
    sections.push('### Team Preferences');
    context.preferences.forEach(e => {
      sections.push(`- [${(e.confidence * 100).toFixed(0)}% confidence] ${e.topic}: ${e.content.slice(0, 200)}`);
    });
  }

  if (context.decisions.length > 0) {
    sections.push('\n### Architectural Decisions (from this project)');
    context.decisions.forEach(e => {
      const adr = e.adr_reference ? ` (${e.adr_reference})` : '';
      sections.push(`- ${e.topic}${adr}: ${e.content.slice(0, 200)}`);
    });
  }

  if (context.bugPatterns.length > 0) {
    sections.push('\n### Bug Patterns to Avoid');
    context.bugPatterns.forEach(e => {
      sections.push(`- ⚠️  ${e.topic}: ${e.root_cause?.slice(0, 150) || e.content.slice(0, 150)}`);
      if (e.fix) sections.push(`  Fix: ${e.fix.slice(0, 100)}`);
    });
  }

  if (context.domain.length > 0) {
    sections.push('\n### Domain Knowledge');
    context.domain.forEach(e => {
      sections.push(`- ${e.topic}: ${e.content.slice(0, 200)}`);
    });
  }

  return sections.join('\n');
}

/**
 * Read tech stack from PROJECT.md for relevance filtering.
 */
function readTechStack() {
  const projectMd = path.join(process.cwd(), '.planning', 'PROJECT.md');
  if (!fs.existsSync(projectMd)) return [];
  const content = fs.readFileSync(projectMd, 'utf8');
  // Extract tech stack section
  const techSection = content.match(/## Tech stack\n+([\s\S]*?)(?=\n##|\Z)/i)?.[1] || '';
  return techSection
    .split('\n')
    .map(l => l.replace(/^[-*•]\s*/, '').split(/[\s,/]/).filter(w => w.length > 2))
    .flat()
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * Generate the memory header displayed at session start.
 */
function generateSessionHeader(loadResult) {
  if (loadResult.count === 0) {
    return '🧠 Knowledge Base — no relevant memories for this session\n';
  }

  const lines = [
    `🧠 Knowledge Base — ${loadResult.count} relevant memories loaded:`,
  ];

  if (loadResult.preferences > 0)  lines.push(`  Preferences  : ${loadResult.preferences}`);
  if (loadResult.decisions > 0)    lines.push(`  Decisions    : ${loadResult.decisions}`);
  if (loadResult.bugPatterns > 0)  lines.push(`  Bug patterns : ${loadResult.bugPatterns}`);
  if (loadResult.codePatterns > 0) lines.push(`  Code patterns: ${loadResult.codePatterns}`);
  if (loadResult.domain > 0)       lines.push(`  Domain       : ${loadResult.domain}`);

  return lines.join('\n');
}

module.exports = { loadForSession, readTechStack, generateSessionHeader, formatForContext };
