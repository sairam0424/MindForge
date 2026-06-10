'use strict';

/**
 * MindForge harness-adapter compliance scorecard.
 *
 * Records, validates, and renders the cross-harness support matrix — which
 * runtimes MindForge can install natively vs. via adapter vs. instruction-only.
 * A `--check` mode gates CI against documentation drift: the rendered matrix in
 * docs must be generated from these records, not hand-edited.
 *
 * Ported from ECC (scripts/lib/harness-adapter-compliance.js): the validator +
 * renderer + doc-drift gate are kept verbatim (fs/path only, zero deps); the
 * ADAPTER_RECORDS are re-authored to reflect MindForge's actual RUNTIMES
 * (bin/installer-core.js): claude, antigravity, cursor, opencode, gemini,
 * copilot — graded by whether each exposes the slash/hook surface MindForge
 * needs (supportsSlash) plus the terminal-only fallback contract.
 */

const fs = require('fs');
const path = require('path');

const MATRIX_BLOCK_START = '<!-- harness-adapter-compliance:matrix-start -->';
const MATRIX_BLOCK_END = '<!-- harness-adapter-compliance:matrix-end -->';

const COMPLIANCE_STATES = Object.freeze({
  Native: 'MindForge can install or verify the surface directly for this harness.',
  'Adapter-backed': 'MindForge has a thin adapter/transform surface, but parity differs by harness.',
  'Instruction-backed': 'MindForge can provide guidance and files, but the harness does not expose the runtime hook/slash surface MindForge needs for enforcement.',
  'Reference-only': 'Useful as design pressure or external runtime, but MindForge does not ship a direct installer/adapter for it.',
});

const REQUIRED_FIELDS = Object.freeze([
  'id',
  'harness',
  'state',
  'supported_assets',
  'unsupported_surfaces',
  'install_or_onramp',
  'verification_commands',
  'risk_notes',
  'last_verified_at',
  'owner',
  'source_docs',
]);

function freezeRecord(record) {
  return Object.freeze({
    ...record,
    supported_assets: Object.freeze(record.supported_assets.slice()),
    unsupported_surfaces: Object.freeze(record.unsupported_surfaces.slice()),
    install_or_onramp: Object.freeze(record.install_or_onramp.slice()),
    verification_commands: Object.freeze(record.verification_commands.slice()),
    risk_notes: Object.freeze(record.risk_notes.slice()),
    source_docs: Object.freeze(record.source_docs.slice()),
  });
}

const ADAPTER_RECORDS = Object.freeze([
  {
    id: 'claude-code',
    harness: 'Claude Code',
    state: 'Native',
    supported_assets: ['skills', 'commands (slash)', 'hooks', 'MCP config', 'subagents', 'settings.json', 'plugin assets'],
    unsupported_surfaces: ['Claude-native hooks do not imply parity in other harnesses'],
    install_or_onramp: ['`npx mindforge-cc@latest --claude --local`', 'Claude plugin install'],
    verification_commands: ['`node bin/harness-audit.js`', '`node bin/install.js --check`'],
    risk_notes: ['Do not load every skill by default; keep hooks opt-in and inspectable.'],
    last_verified_at: '2026-06-10',
    owner: 'MindForge maintainers',
    source_docs: ['.claude/settings.json', '.claude-plugin/', 'bin/installer-core.js'],
  },
  {
    id: 'antigravity',
    harness: 'Antigravity (Gemini)',
    state: 'Adapter-backed',
    supported_assets: ['skills', 'commands (namespace:prefix)', 'rules', 'MCP reference config'],
    unsupported_surfaces: ['Command naming uses mindforge: namespace prefix; hook parity differs from Claude'],
    install_or_onramp: ['`npx mindforge-cc@latest --antigravity --local`'],
    verification_commands: ['`node bin/harness-audit.js`'],
    risk_notes: ['Keep the .agent settings mirror in sync with .claude (Gemini mirror is live, not dead).'],
    last_verified_at: '2026-06-10',
    owner: 'MindForge maintainers',
    source_docs: ['.agent/settings.json', 'bin/installer-core.js'],
  },
  {
    id: 'opencode',
    harness: 'OpenCode',
    state: 'Adapter-backed',
    supported_assets: ['skills', 'commands (slash)', 'MCP config', 'event adapter patterns'],
    unsupported_surfaces: ['Event names and command dispatch differ from Claude Code'],
    install_or_onramp: ['`npx mindforge-cc@latest --opencode --local`'],
    verification_commands: ['`node bin/harness-audit.js`'],
    risk_notes: ['Keep hook logic in shared scripts; adapt only event shape at the edge.'],
    last_verified_at: '2026-06-10',
    owner: 'MindForge maintainers',
    source_docs: ['bin/installer-core.js'],
  },
  {
    id: 'gemini',
    harness: 'Gemini CLI',
    state: 'Instruction-backed',
    supported_assets: ['project-local instructions (GEMINI.md)', 'skills', 'rules'],
    unsupported_surfaces: ['No full hook parity; slash surface differs; ports must document drift'],
    install_or_onramp: ['`npx mindforge-cc@latest --gemini --local`'],
    verification_commands: ['`node bin/harness-audit.js`'],
    risk_notes: ['Treat Gemini ports as ecosystem adapters until validated end-to-end inside Gemini CLI.'],
    last_verified_at: '2026-06-10',
    owner: 'MindForge maintainers',
    source_docs: ['bin/installer-core.js', '.agent/skills/mindforge-neural-orchestrator/references/gemini-tools.md'],
  },
  {
    id: 'cursor',
    harness: 'Cursor',
    state: 'Instruction-backed',
    supported_assets: ['Cursor rules', 'project-local skills', 'instruction entry file'],
    unsupported_surfaces: ['No slash-command surface (supportsSlash:false); hook events differ from Claude'],
    install_or_onramp: ['`npx mindforge-cc@latest --cursor --local`'],
    verification_commands: ['`node bin/harness-audit.js`'],
    risk_notes: ['Cursor adapters must preserve existing project rules and avoid silent overwrite.'],
    last_verified_at: '2026-06-10',
    owner: 'MindForge maintainers',
    source_docs: ['bin/installer-core.js'],
  },
  {
    id: 'copilot',
    harness: 'GitHub Copilot',
    state: 'Instruction-backed',
    supported_assets: ['copilot-instructions.md entry', 'rules', 'project-local skills'],
    unsupported_surfaces: ['No slash-command surface (supportsSlash:false); no native hook enforcement'],
    install_or_onramp: ['`npx mindforge-cc@latest --copilot --local`'],
    verification_commands: ['`node bin/harness-audit.js`'],
    risk_notes: ['Treat hooks as policy text; Copilot has no runtime hook surface.'],
    last_verified_at: '2026-06-10',
    owner: 'MindForge maintainers',
    source_docs: ['bin/installer-core.js'],
  },
  {
    id: 'terminal-only',
    harness: 'Terminal-only',
    state: 'Native',
    supported_assets: ['skills', 'rules', 'commands', 'bin/ scripts', 'harness audit', 'AUDIT.jsonl'],
    unsupported_surfaces: ['No external UI; no automatic session control unless scripts run explicitly'],
    install_or_onramp: ['Clone repo', 'run bin/ commands directly', 'use --local for project installs'],
    verification_commands: ['`node bin/harness-audit.js`', '`node tests/run-all.js`'],
    risk_notes: ['This is the fallback contract; every higher-level adapter should degrade to it.'],
    last_verified_at: '2026-06-10',
    owner: 'MindForge maintainers',
    source_docs: ['bin/harness-audit.js', 'bin/mindforge-cli.js'],
  },
].map(freezeRecord));

function toTextList(value) {
  return Array.isArray(value) ? value.join('; ') : String(value || '');
}

function escapeMarkdownCell(value) {
  return toTextList(value).replace(/\|/g, '\\|').trim();
}

function renderMarkdownTable(records = ADAPTER_RECORDS) {
  const lines = [
    '| Harness or runtime | State | Supported assets | Unsupported or different surfaces | Install or onramp | Verification command | Risk notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const record of records) {
    lines.push([
      record.harness,
      record.state,
      record.supported_assets,
      record.unsupported_surfaces,
      record.install_or_onramp,
      record.verification_commands,
      record.risk_notes,
    ].map(escapeMarkdownCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  return lines.join('\n');
}

function renderStateTable() {
  const lines = ['| State | Meaning |', '| --- | --- |'];
  for (const [state, meaning] of Object.entries(COMPLIANCE_STATES)) {
    lines.push(`| ${escapeMarkdownCell(state)} | ${escapeMarkdownCell(meaning)} |`);
  }
  return lines.join('\n');
}

function validateAdapterRecords(records = ADAPTER_RECORDS) {
  const errors = [];
  const ids = new Set();

  records.forEach((record, index) => {
    const label = record?.id || `record[${index}]`;

    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(record, field)) {
        errors.push(`${label}: missing required field ${field}`);
      }
    }

    if (typeof record.id !== 'string' || !/^[a-z0-9-]+$/.test(record.id)) {
      errors.push(`${label}: id must be a lowercase slug`);
    } else if (ids.has(record.id)) {
      errors.push(`${label}: duplicate id`);
    } else {
      ids.add(record.id);
    }

    if (!Object.prototype.hasOwnProperty.call(COMPLIANCE_STATES, record.state)) {
      errors.push(`${label}: unknown state ${record.state}`);
    }

    for (const field of [
      'supported_assets',
      'unsupported_surfaces',
      'install_or_onramp',
      'verification_commands',
      'risk_notes',
      'source_docs',
    ]) {
      if (!Array.isArray(record[field]) || record[field].length === 0) {
        errors.push(`${label}: ${field} must be a non-empty array`);
        continue;
      }

      record[field].forEach((value, valueIndex) => {
        if (typeof value !== 'string' || !value.trim()) {
          errors.push(`${label}: ${field}[${valueIndex}] must be a non-empty string`);
        }
      });
    }

    if (typeof record.harness !== 'string' || !record.harness.trim()) {
      errors.push(`${label}: harness must be a non-empty string`);
    }

    if (typeof record.owner !== 'string' || !record.owner.trim()) {
      errors.push(`${label}: owner must be a non-empty string`);
    }

    if (typeof record.last_verified_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.last_verified_at)) {
      errors.push(`${label}: last_verified_at must be YYYY-MM-DD`);
    }
  });

  return errors;
}

function extractMatrixBlock(markdown) {
  const normalized = String(markdown).replace(/\r\n/g, '\n');
  const start = normalized.indexOf(MATRIX_BLOCK_START);
  const end = normalized.indexOf(MATRIX_BLOCK_END);

  if (start < 0 || end < 0 || end <= start) {
    return null;
  }

  return normalized.slice(start + MATRIX_BLOCK_START.length, end).trim();
}

function validateDocumentation(options = {}) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, '..', '..');
  const docPath = options.docPath || path.join(repoRoot, 'docs', 'architecture', 'harness-adapter-compliance.md');
  const errors = [];

  let source;
  try {
    source = fs.readFileSync(docPath, 'utf8');
  } catch (_error) {
    errors.push(`compliance doc not found: ${path.relative(repoRoot, docPath)}`);
    return errors;
  }

  const actual = extractMatrixBlock(source);
  const expected = renderMarkdownTable();

  if (actual === null) {
    errors.push(`missing matrix block markers in ${path.relative(repoRoot, docPath)}`);
  } else if (actual !== expected) {
    errors.push(`matrix block in ${path.relative(repoRoot, docPath)} is not generated from adapter records`);
  }

  return errors;
}

module.exports = {
  ADAPTER_RECORDS,
  COMPLIANCE_STATES,
  MATRIX_BLOCK_END,
  MATRIX_BLOCK_START,
  REQUIRED_FIELDS,
  extractMatrixBlock,
  renderMarkdownTable,
  renderStateTable,
  validateAdapterRecords,
  validateDocumentation,
};

// CLI: `node bin/installer/harness-adapter-compliance.js [--check]`
if (require.main === module) {
  const args = process.argv.slice(2);
  const recordErrors = validateAdapterRecords();
  if (recordErrors.length > 0) {
    process.stderr.write('❌ adapter record errors:\n  ' + recordErrors.join('\n  ') + '\n');
    process.exit(1);
  }

  if (args.includes('--check')) {
    const docErrors = validateDocumentation();
    if (docErrors.length > 0) {
      process.stderr.write('❌ compliance doc drift:\n  ' + docErrors.join('\n  ') + '\n');
      process.exit(1);
    }
    process.stdout.write('✅ harness-adapter compliance: records valid, doc in sync\n');
    process.exit(0);
  }

  // Default: print the rendered matrix (for pasting into the doc block).
  process.stdout.write(renderStateTable() + '\n\n' + renderMarkdownTable() + '\n');
}
