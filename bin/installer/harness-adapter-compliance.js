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
  // install_claims is the machine-checkable half of the record. Before it existed, every claim in
  // this file was prose that only `--check` looked at, and `--check` compares the doc against these
  // records — so a record that was false about the installer propagated INTO the documentation and
  // nothing ever compared either side to a real install. See tests/harness-emitted-tree.test.js.
  'install_claims',
]);

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepFreeze(v)])));
  }
  return value;
}

function freezeRecord(record) {
  return Object.freeze({
    ...record,
    supported_assets: Object.freeze(record.supported_assets.slice()),
    unsupported_surfaces: Object.freeze(record.unsupported_surfaces.slice()),
    install_or_onramp: Object.freeze(record.install_or_onramp.slice()),
    verification_commands: Object.freeze(record.verification_commands.slice()),
    risk_notes: Object.freeze(record.risk_notes.slice()),
    source_docs: Object.freeze(record.source_docs.slice()),
    install_claims: deepFreeze(record.install_claims),
  });
}

/**
 * The seven asset trees the installer copies into a harness dir, one per subdir key declared in that
 * harness's RUNTIMES entry (bin/installer-core.js:604-627 — `if (subDir && fsu.exists(asset.src))`,
 * so a harness that declares no key silently receives nothing).
 *
 * Every count below was MEASURED on `git clone --no-hardlinks` of 963902d followed by
 * `node bin/install.js --<runtime> --local` in a fresh mktemp -d with HOME also confined to a fresh
 * mktemp -d (the installer writes ~/.mindforge/registry.json — bin/installer-core.js:835).
 * They are floors, not equalities, so adding a skill does not turn the suite red; a *missing* tree
 * counts 0 and fails. `verbatim_subset_of` is the content half: every file under that repo-relative
 * source dir must exist in the emitted dir with byte-identical content, so a stale or truncated copy
 * fails even though its name and count are unchanged.
 */
function sharedAssetTrees(base, { hooks = 11 } = {}) {
  return [
    { asset: 'skills', dir: `${base}/skills`, min_files: 282, verbatim_subset_of: '.agent/skills' },
    { asset: 'hooks', dir: `${base}/hooks`, min_files: hooks, verbatim_subset_of: '.agent/hooks' },
    { asset: 'personas', dir: `${base}/personas`, min_files: 218, verbatim_subset_of: '.mindforge/personas' },
    { asset: 'docs references', dir: `${base}/docs/references`, min_files: 20, verbatim_subset_of: 'docs/References' },
    { asset: 'docs templates', dir: `${base}/docs/templates`, min_files: 42, verbatim_subset_of: 'docs/Templates' },
    { asset: 'memory specs', dir: `${base}/memory`, min_files: 4, verbatim_subset_of: '.mindforge/memory' },
    { asset: 'plugin specs', dir: `${base}/plugins`, min_files: 4, verbatim_subset_of: '.mindforge/plugins' },
  ];
}

/**
 * Commands come from two sources: `.agent/mindforge` (221 files) and `.agent/forge` (3 files).
 *
 * THIS RECORD USED TO DOCUMENT A DATA-LOSS BUG AS A SPECIFICATION. Both sources were written into the
 * same directory under their bare filenames, forge second, and all three forge names collide with
 * mindforge names — so forge won. The previous version of this comment said so plainly ("The three
 * forge names collide with mindforge names and WIN, which is why the total is 221 and not 224") and
 * then encoded it: `min_files: 221` and a probe asserting `help.md` was byte-identical to
 * `.agent/forge/help.md`. Someone observed the overwrite, understood it, and pinned it as correct.
 *
 * What was actually being lost, measured against the sources:
 *   help.md 33 -> 11 lines, init-project.md 170 -> 36, plan-phase.md 131 -> 34.  253 lines, silently,
 *   on every install — and the three surviving forge commands pointed at `.claude/commands/forge/`,
 *   a directory the installer never created.
 *
 * The installer now gives each namespace its own destination (resolveCommandTarget in
 * bin/installer-core.js), so nothing is overwritten. Measured after that change:
 *   claude / opencode / gemini / copilot   commands/mindforge  221 files, sibling forge/  3 files
 *   cursor (flat `rules/`)                 rules               224 files (forge prefixed `forge:`)
 *
 * So min_files is 221 for the namespaced harnesses — the probed directory holds mindforge's set — and
 * 224 for cursor, where both land side by side. And `help.md` in the probed directory is now
 * mindforge's, which is what the probe asserts.
 *
 * @param {string} asset
 * @param {string} dir
 * @param {number} [minFiles=221] 224 for harnesses whose commands directory is not per-namespace.
 */
function flatCommandTree(asset, dir, minFiles = 221) {
  return {
    asset,
    dir,
    min_files: minFiles,
    probes: [
      { file: 'security-scan.md', identical_to: '.agent/mindforge/security-scan.md' },
      { file: 'help.md', identical_to: '.agent/mindforge/help.md' },
    ],
  };
}

const ADAPTER_RECORDS = Object.freeze([
  {
    id: 'claude-code',
    harness: 'Claude Code',
    state: 'Native',
    supported_assets: ['skills', 'commands (slash)', 'hooks (scripts + registered settings.json)', 'subagents', 'personas', 'docs references and templates', 'memory and plugin specs'],
    unsupported_surfaces: [
      'Claude-native hooks do not imply parity in other harnesses',
      'No MCP config: the installer writes no .mcp.json and no mcpServers key for ANY harness — the only mcpServers strings in an emitted tree are inside two content files (.mindforge/schemas/plugin.schema.json and .claude/agents/scientific-literature-researcher.md)',
      'Commands arrive as TWO namespaces, not one: .claude/commands/mindforge/ (221 files) and .claude/commands/forge/ (3). The three forge basenames collide with mindforge names, so they get their own directory — which is also where .agent/forge/help.md says forge commands live. Until this was fixed the forge copies overwrote the mindforge ones in place, destroying 253 lines across help.md, init-project.md and plan-phase.md on every install',
    ],
    install_or_onramp: ['`npx mindforge-cc@latest --claude --local`', 'Claude plugin install'],
    // `node bin/install.js --check` was listed here and is an npm UPDATE check (bin/install.js:114
    // "Check for updates without installing"), not an install verification — it exited 1 against a
    // freshly installed project. Replaced with the gate that actually inspects the emitted tree.
    verification_commands: ['`node bin/harness-audit.js`', '`node tests/harness-emitted-tree.test.js`'],
    risk_notes: ['Do not load every skill by default; keep hooks opt-in and inspectable.'],
    last_verified_at: '2026-08-19',
    owner: 'MindForge maintainers',
    source_docs: ['.claude/settings.json', '.claude-plugin/', 'bin/installer-core.js'],
    install_claims: {
      runtime: 'claude',
      base_dir: '.claude',
      entry_files: ['.claude/CLAUDE.md', 'CLAUDE.md'],
      emits: [
        flatCommandTree('commands (slash)', '.claude/commands/mindforge'),
        // 16, not 11: REG-01 adds instinct/, security/ and utils/file-lock.js on top of the 11
        // copied from .agent/hooks (bin/installer/hook-registration.js).
        ...sharedAssetTrees('.claude', { hooks: 16 }),
        {
          asset: 'subagents',
          dir: '.claude/agents',
          min_files: 164,
          probes: [{ file: 'backend-developer.md', identical_to: 'subagents/categories/01-core-development/backend-developer.md' }],
        },
        {
          asset: 'settings.json (registered hooks)',
          file: '.claude/settings.json',
          contains: ['"PreToolUse"', '"PostToolUse"', '"SessionStart"', 'run-with-flags.js', 'mindforge-config-protection'],
        },
      ],
      absent_dirs: [],
      no_harness_surface_for: [],
      claude_mirror: 'own',
    },
  },
  {
    id: 'antigravity',
    harness: 'Antigravity (Gemini)',
    state: 'Adapter-backed',
    // 'rules' and 'MCP reference config' were both false: a clean `--antigravity --local` emits no
    // .agents/rules and no MCP config anywhere. What it DOES emit and the record omitted: hooks,
    // personas, docs and the memory/plugin specs.
    supported_assets: ['skills', 'commands (namespace:prefix, .agents/workflows/)', 'hooks (scripts only, unregistered)', 'personas', 'docs references and templates', 'memory and plugin specs', 'subagents via the shared .claude/ mirror'],
    unsupported_surfaces: [
      'Command naming uses mindforge: namespace prefix; hook parity differs from Claude',
      'No .agents/settings.json is written, so the 11 copied hook scripts are inert — REG-01 registers claude + local only (bin/installer/hook-registration.js)',
      'No .agents/rules directory and no MCP config are emitted',
    ],
    install_or_onramp: ['`npx mindforge-cc@latest --antigravity --local`'],
    verification_commands: ['`node bin/harness-audit.js`', '`node tests/harness-emitted-tree.test.js`'],
    risk_notes: ['Keep the .agent settings mirror in sync with .claude (Gemini mirror is live, not dead).'],
    last_verified_at: '2026-08-19',
    owner: 'MindForge maintainers',
    source_docs: ['.agent/settings.json', 'bin/installer-core.js'],
    install_claims: {
      runtime: 'antigravity',
      base_dir: '.agents',
      entry_files: ['.agents/CLAUDE.md', 'CLAUDE.md'],
      emits: [
        // 224, and the only transformed copy in the installer: frontmatter is re-emitted as a lone
        // `description:` and the source frontmatter stripped (bin/installer-core.js:571-578), so this
        // one cannot be checked byte-for-byte against its source.
        {
          asset: 'commands (namespace:prefix)',
          dir: '.agents/workflows',
          min_files: 224,
          probes: [{ file: 'mindforge:security-scan.md', contains: ['description:', '# MindForge — Security Scan Command'] }],
        },
        ...sharedAssetTrees('.agents'),
      ],
      absent_dirs: [{ asset: 'subagents (harness dir)', dir: '.agents/agents' }],
      no_harness_surface_for: ['rules', 'settings.json'],
      claude_mirror: 'shared',
    },
  },
  {
    id: 'opencode',
    harness: 'OpenCode',
    state: 'Adapter-backed',
    // 'MCP config' and 'event adapter patterns' were both false: no MCP config is emitted for any
    // harness, and no OpenCode event-adapter file is emitted either — the 11 hook scripts under
    // .opencode/hooks/ are byte-identical Claude-shaped scripts from .agent/hooks.
    supported_assets: ['skills', 'commands (slash)', 'hooks (scripts only, unregistered)', 'personas', 'docs references and templates', 'memory and plugin specs', 'subagents via the shared .claude/ mirror'],
    unsupported_surfaces: [
      'Event names and command dispatch differ from Claude Code',
      'No .opencode/settings.json is written, so the 11 copied hook scripts are inert — REG-01 registers claude + local only',
      'No MCP config and no OpenCode-shaped event-adapter files are emitted; the copied hooks are the unmodified Claude scripts',
    ],
    install_or_onramp: ['`npx mindforge-cc@latest --opencode --local`'],
    verification_commands: ['`node bin/harness-audit.js`', '`node tests/harness-emitted-tree.test.js`'],
    risk_notes: ['Keep hook logic in shared scripts; adapt only event shape at the edge.'],
    last_verified_at: '2026-08-19',
    owner: 'MindForge maintainers',
    source_docs: ['bin/installer-core.js'],
    install_claims: {
      runtime: 'opencode',
      base_dir: '.opencode',
      entry_files: ['.opencode/CLAUDE.md', 'CLAUDE.md'],
      emits: [
        flatCommandTree('commands (slash)', '.opencode/commands/mindforge'),
        ...sharedAssetTrees('.opencode'),
      ],
      absent_dirs: [{ asset: 'subagents (harness dir)', dir: '.opencode/agents' }],
      no_harness_surface_for: ['settings.json'],
      claude_mirror: 'shared',
    },
  },
  {
    id: 'gemini',
    harness: 'Gemini CLI',
    state: 'Instruction-backed',
    // 'rules' was false (no .gemini/rules is emitted). The record also omitted the slash commands it
    // DOES receive: 221 files under .gemini/commands/mindforge/ (supportsSlash:true in RUNTIMES).
    supported_assets: ['project-local instructions (GEMINI.md)', 'skills', 'commands (slash)', 'hooks (scripts only, unregistered)', 'personas', 'docs references and templates', 'memory and plugin specs', 'subagents via the shared .claude/ mirror'],
    unsupported_surfaces: [
      'No full hook parity; ports must document drift',
      'No .gemini/settings.json is written, so the 11 copied hook scripts are inert — REG-01 registers claude + local only',
      'No .gemini/rules directory and no MCP config are emitted',
    ],
    install_or_onramp: ['`npx mindforge-cc@latest --gemini --local`'],
    verification_commands: ['`node bin/harness-audit.js`', '`node tests/harness-emitted-tree.test.js`'],
    risk_notes: ['Treat Gemini ports as ecosystem adapters until validated end-to-end inside Gemini CLI.'],
    last_verified_at: '2026-08-19',
    owner: 'MindForge maintainers',
    source_docs: ['bin/installer-core.js', '.agent/skills/mindforge-neural-orchestrator/references/gemini-tools.md'],
    install_claims: {
      runtime: 'gemini',
      base_dir: '.gemini',
      entry_files: ['.gemini/GEMINI.md', 'GEMINI.md', 'CLAUDE.md'],
      emits: [
        flatCommandTree('commands (slash)', '.gemini/commands/mindforge'),
        ...sharedAssetTrees('.gemini'),
      ],
      absent_dirs: [{ asset: 'subagents (harness dir)', dir: '.gemini/agents' }],
      no_harness_surface_for: ['rules', 'settings.json'],
      claude_mirror: 'shared',
    },
  },
  {
    id: 'cursor',
    harness: 'Cursor',
    state: 'Instruction-backed',
    // All three original claims were true; they were merely incomplete — the record named 3 of the
    // 8 asset kinds a Cursor install actually receives.
    supported_assets: ['Cursor rules (commands rendered into .cursor/rules/)', 'project-local skills', 'instruction entry file (.cursorrules)', 'hooks (scripts only, unregistered)', 'personas', 'docs references and templates', 'memory and plugin specs', 'subagents via the shared .claude/ mirror'],
    unsupported_surfaces: [
      'No slash-command surface (supportsSlash:false); hook events differ from Claude',
      'No .cursor/settings.json is written, so the 11 copied hook scripts are inert — REG-01 registers claude + local only',
      'No MCP config is emitted',
    ],
    install_or_onramp: ['`npx mindforge-cc@latest --cursor --local`'],
    verification_commands: ['`node bin/harness-audit.js`', '`node tests/harness-emitted-tree.test.js`'],
    risk_notes: ['Cursor adapters must preserve existing project rules and avoid silent overwrite.'],
    last_verified_at: '2026-08-19',
    owner: 'MindForge maintainers',
    source_docs: ['bin/installer-core.js'],
    install_claims: {
      runtime: 'cursor',
      base_dir: '.cursor',
      entry_files: ['.cursor/.cursorrules', '.cursorrules', 'CLAUDE.md'],
      emits: [
        flatCommandTree('Cursor rules', '.cursor/rules', 224),
        ...sharedAssetTrees('.cursor'),
      ],
      absent_dirs: [{ asset: 'subagents (harness dir)', dir: '.cursor/agents' }],
      no_harness_surface_for: ['settings.json'],
      claude_mirror: 'shared',
    },
  },
  {
    id: 'copilot',
    harness: 'GitHub Copilot',
    state: 'Instruction-backed',
    // 'rules' and 'project-local skills' were both FALSE, and the second is the dangerous one: a
    // clean `--copilot --local` emits .github/copilot-instructions/mindforge/ (221 files) and
    // .github/copilot-instructions.md, and NOTHING ELSE UNDER .github/ — 0 skills, 0 hooks, 0
    // personas, 0 docs, 0 memory, 0 plugin specs ON ANY COPILOT-READABLE SURFACE.
    //
    // Scoped to .github/ deliberately. Read as an absolute this is false: the same install receives
    // the shared .mindforge/ tree, measured at 232 SKILL.md files (322 files) under
    // .mindforge/skills/ and 218 under .mindforge/personas/, identical for every harness and read by
    // the MindForge runtime in bin/ rather than by Copilot. An earlier draft of this record said
    // Copilot gets "zero skills in total"; that would point a reader at delivering assets that are
    // already present instead of at the real gap, which is the unpopulated Copilot surface.
    // The copilot RUNTIMES entry (bin/installer-core.js:89-96) declares
    // none of the six subdir keys, and bin/installer-core.js:614-616 skips any asset whose key is
    // undefined. Deliberately NOT fixed by inventing a Copilot file contract for skills: nothing in
    // this repository documents a layout Copilot reads for them, and guessing one reproduces exactly
    // the fail-open registration REG-01 existed to remove. The honest boundary is stated instead.
    supported_assets: ['copilot-instructions.md entry (project root and .github/)', 'commands as instruction files (.github/copilot-instructions/mindforge/)', 'shared .mindforge/ framework tree (identical for every harness)', 'subagents and command copies via the shared .claude/ mirror'],
    unsupported_surfaces: [
      'No slash-command surface (supportsSlash:false); no native hook enforcement',
      'Receives NO harness-surface skills, hooks, personas, docs, memory or plugin assets: the copilot RUNTIMES entry (bin/installer-core.js:89-96) declares no skillsSubdir/hooksSubdir/personasSubdir/docsSubdir/memorySubdir/pluginsSubdir, and bin/installer-core.js:614-616 copies an asset only when its subdir key is set',
      'No .github/settings.json and no MCP config',
    ],
    install_or_onramp: ['`npx mindforge-cc@latest --copilot --local`'],
    verification_commands: ['`node bin/harness-audit.js`', '`node tests/harness-emitted-tree.test.js`'],
    // The previous note ("Treat hooks as policy text") implied hook files arrive as text. None do.
    risk_notes: ['Copilot has no runtime hook surface AND receives no hook files at all; do not add a Copilot contract for skills or hooks without evidence of a layout Copilot reads, or the install fails open again.'],
    last_verified_at: '2026-08-19',
    owner: 'MindForge maintainers',
    source_docs: ['bin/installer-core.js'],
    install_claims: {
      runtime: 'copilot',
      base_dir: '.github',
      entry_files: ['.github/copilot-instructions.md', 'copilot-instructions.md', 'CLAUDE.md'],
      emits: [flatCommandTree('commands as instruction files', '.github/copilot-instructions/mindforge')],
      absent_dirs: [
        { asset: 'skills', dir: '.github/skills' },
        { asset: 'hooks', dir: '.github/hooks' },
        { asset: 'personas', dir: '.github/personas' },
        { asset: 'docs', dir: '.github/docs' },
        { asset: 'memory', dir: '.github/memory' },
        { asset: 'plugins', dir: '.github/plugins' },
        { asset: 'subagents (harness dir)', dir: '.github/agents' },
      ],
      no_harness_surface_for: ['skills', 'hooks', 'personas', 'docs', 'memory', 'plugins', 'rules', 'settings.json'],
      claude_mirror: 'shared',
    },
  },
  {
    id: 'terminal-only',
    harness: 'Terminal-only',
    state: 'Native',
    supported_assets: ['skills', 'rules', 'commands', 'bin/ scripts', 'harness audit'],
    unsupported_surfaces: [
      'No external UI; no automatic session control unless scripts run explicitly',
      '.planning/AUDIT.jsonl is gitignored and absent from a fresh clone — it is created by the first audited run, not shipped',
    ],
    install_or_onramp: ['Clone repo', 'run bin/ commands directly', 'use --local for project installs'],
    verification_commands: ['`node bin/harness-audit.js`', '`node tests/run-all.js`'],
    risk_notes: ['This is the fallback contract; every higher-level adapter should degrade to it.'],
    last_verified_at: '2026-08-19',
    owner: 'MindForge maintainers',
    source_docs: ['bin/harness-audit.js', 'bin/mindforge-cli.js'],
    // Not an installer target — there is no key for it in installer-core RUNTIMES, so there is no
    // emitted tree to assert. null rather than omitted, and tests/harness-emitted-tree.test.js pins
    // the set of nulls against Object.keys(RUNTIMES) so a harness cannot dodge the gate by nulling.
    install_claims: null,
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

    errors.push(...validateInstallClaims(record, label));
  });

  return errors;
}

/**
 * Shape-check install_claims so a malformed claim fails `npm run harness:compliance` rather than
 * silently disabling an assertion in tests/harness-emitted-tree.test.js. A claim with no `emits` is
 * the specific hazard: the tree loop would iterate zero times and the harness would look verified.
 */
function validateInstallClaims(record, label) {
  const errors = [];
  const claims = record.install_claims;

  if (claims === null) return errors;

  if (typeof claims !== 'object' || Array.isArray(claims)) {
    errors.push(`${label}: install_claims must be an object or null`);
    return errors;
  }

  for (const field of ['runtime', 'base_dir', 'claude_mirror']) {
    if (typeof claims[field] !== 'string' || !claims[field].trim()) {
      errors.push(`${label}: install_claims.${field} must be a non-empty string`);
    }
  }

  if (!['own', 'shared'].includes(claims.claude_mirror)) {
    errors.push(`${label}: install_claims.claude_mirror must be "own" or "shared"`);
  }

  if (!Array.isArray(claims.entry_files) || claims.entry_files.length === 0) {
    errors.push(`${label}: install_claims.entry_files must be a non-empty array`);
  }

  for (const field of ['absent_dirs', 'no_harness_surface_for']) {
    if (!Array.isArray(claims[field])) {
      errors.push(`${label}: install_claims.${field} must be an array`);
    }
  }

  if (!Array.isArray(claims.emits) || claims.emits.length === 0) {
    errors.push(`${label}: install_claims.emits must be a non-empty array`);
    return errors;
  }

  claims.emits.forEach((entry, index) => {
    const at = `${label}: install_claims.emits[${index}]`;
    if (typeof entry.asset !== 'string' || !entry.asset.trim()) errors.push(`${at}.asset must be a non-empty string`);

    if (typeof entry.file === 'string') {
      if (!Array.isArray(entry.contains) || entry.contains.length === 0) {
        errors.push(`${at}.contains must be a non-empty array for a file claim`);
      }
      return;
    }

    if (typeof entry.dir !== 'string' || !entry.dir.trim()) {
      errors.push(`${at} must declare either a dir or a file`);
      return;
    }
    // A floor of 0 would make the count assertion unfalsifiable — an absent directory counts 0.
    if (!Number.isInteger(entry.min_files) || entry.min_files < 1) {
      errors.push(`${at}.min_files must be an integer >= 1`);
    }
    const hasContentCheck = typeof entry.verbatim_subset_of === 'string'
      || (Array.isArray(entry.probes) && entry.probes.length > 0);
    if (!hasContentCheck) {
      errors.push(`${at} must carry a content check (verbatim_subset_of or probes), not just a count`);
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
  validateInstallClaims,
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
