'use strict';
/**
 * MindForge — MINDFORGE.md parameter parser (single source of truth).
 *
 * TWO on-disk forms are supported, because both ship:
 *
 * 1. BRACKETED (current, MINDFORGE.md) — 43 keys in the shipped registry:
 *        [PLANNER]  = claude-opus-4-7
 *        [MODE]     = "Platform Sovereign"
 *        [API_URL]  = <http://localhost:3000>
 *        [PQAS_ENFORCED] = false  # trailing note
 *        [FORBIDDEN] = """
 *        ...multi-line block...
 *        """
 *
 * 2. LEGACY PLAIN (shell-style) — 28 keys in examples/starter-project/MINDFORGE.md,
 *    which ships (package.json files[] contains "examples/"), and the
 *    tests/cli-router.test.js:110 fixture. A bracket-only parser silently
 *    zeroes those out:
 *        MAX_TASKS_PER_PHASE=999
 *        DISABLED_SKILLS=            <- empty value is LEGAL, hence (.*) not (.+)
 *
 * Bracketed semantics are ported from sdk/src/client.ts:141-158 (the only
 * previously correct bracket-aware reader) and extended with value
 * normalisation so the runtime and the validator agree on one interpretation.
 *
 * NOT captured: prose bullets such as `- [MIN_SOUL_SCORE] — description`
 * (section 7 of MINDFORGE.md). A bracketed key only counts when the bracket
 * opens the line (leading whitespace allowed) and is followed by `=`.
 *
 * The legacy form deliberately allows NO leading whitespace, matching the two
 * regexes it replaces (bin/validate-config.js:36, bin/models/model-router.js:48).
 * That is a safety property, not an oversight: it stops indented `KEY=value`
 * lines inside markdown code blocks from being read as configuration.
 */

const fs = require('fs');

/** [KEY] = value — key must open the line; only spaces/tabs may precede it. */
const ASSIGN_RE = /^[ \t]*\[([A-Z0-9_]+)\][ \t]*=[ \t]*(.*)$/;

/** KEY=value — legacy plain form. Column 0 only. `(.*)`: empty values are legal. */
const LEGACY_RE = /^([A-Z0-9_]+)=(.*)$/;

const FENCE = '"""';

/** Drop a trailing ` # comment`. Requires whitespace before `#` so that
 *  values legitimately containing `#` (URL fragments, colours) survive. */
function stripComment(raw) {
  const i = raw.search(/\s#/);
  return i === -1 ? raw : raw.slice(0, i);
}

/** Unwrap "quoted" values and <markdown-autolink> URLs. */
function unwrap(v) {
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  if (v.length >= 2 && v.startsWith('<') && v.endsWith('>')) return v.slice(1, -1);
  return v;
}

function normalise(raw) {
  return unwrap(stripComment(raw).trim());
}

/**
 * @param {string} content raw MINDFORGE.md text
 * @returns {Record<string,string>} key -> normalised string value
 */
function parseParams(content) {
  const bracketed = {};
  const legacy    = {};
  const lines = String(content).split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(ASSIGN_RE);

    if (!m) {
      // Legacy plain form. Only reached when the line is not a bracketed
      // assignment; the two patterns can never both match one line.
      const g = lines[i].match(LEGACY_RE);
      if (g) legacy[g[1]] = normalise(g[2]);
      continue;
    }

    const key = m[1];
    const rest = m[2].trim();

    if (rest.startsWith(FENCE)) {
      const inline = rest.slice(FENCE.length);
      // Single-line fenced value: [K] = """text"""
      if (inline.trimEnd().endsWith(FENCE) && inline.trim().length >= FENCE.length) {
        bracketed[key] = inline.trimEnd().slice(0, -FENCE.length).trim();
        continue;
      }
      const block = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (lines[j].trim() === FENCE) break;
        block.push(lines[j]);
      }
      bracketed[key] = block.join('\n').trim();
      i = j; // resume after the closing fence (or at EOF)
      continue;
    }

    bracketed[key] = normalise(rest);
  }

  // Bracketed is the canonical modern form and wins on collision, regardless
  // of which appeared first in the file.
  return { ...legacy, ...bracketed };
}

/**
 * Read + parse a MINDFORGE.md. Returns {} when the file is absent so callers
 * can fall back to their own defaults (fail-open on absence, not on garbage).
 * @param {string} filePath
 */
function readParams(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseParams(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { parseParams, readParams, ASSIGN_RE, LEGACY_RE };
