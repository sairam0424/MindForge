// @timeout: 300000
/**
 * Gate the harness-adapter compliance RECORD against the tree the installer really writes.
 *
 * THE DEFECT. `npm run harness:compliance -- --check` compares
 * docs/architecture/harness-adapter-compliance.md against ADAPTER_RECORDS in
 * bin/installer/harness-adapter-compliance.js. It therefore proves the doc was generated from the
 * record — and nothing at all about whether the record is TRUE. Nothing in the repository read an
 * emitted install tree, so a false claim propagated straight into published documentation. Measured
 * against 963902d before this file existed, by installing all six harnesses into fresh temp dirs with
 * HOME confined (the installer writes ~/.mindforge/registry.json — bin/installer-core.js:835):
 *
 *   copilot   supported_assets claimed 'project-local skills' and 'rules'.
 *             Emitted: .github/copilot-instructions/mindforge/ (221 files) + copilot-instructions.md.
 *             NOTHING else. .github/skills 0, hooks 0, personas 0, docs 0, memory 0, plugins 0 —
 *             because the copilot RUNTIMES entry (installer-core.js:89-96) declares no *Subdir keys
 *             and installer-core.js:614-616 copies an asset only when its key is set.
 *   claude    claimed 'MCP config'.      No harness receives one: zero .mcp.json anywhere, and the
 *   antigravity claimed 'MCP reference config'   only mcpServers strings in an emitted tree are inside
 *   opencode  claimed 'MCP config'.      two content files (a JSON schema and a subagent .md).
 *   antigravity/gemini claimed 'rules'.  No .agents/rules, no .gemini/rules is ever created.
 *   opencode  claimed 'event adapter patterns'. Its 11 hooks are byte-identical Claude scripts.
 *   gemini    omitted the 221 slash commands it does receive under .gemini/commands/mindforge/.
 *
 * WHAT THIS FILE PINS, and why each assertion can fail — every one was mutated and observed RED
 * before being kept (see the falsification log in the PR body):
 *   1. records validate, and the set of records carrying install_claims is EXACTLY
 *      Object.keys(installer-core RUNTIMES) — so a harness cannot dodge the gate by nulling its
 *      claims, and a new runtime cannot ship unclaimed.
 *   2. every claimed asset dir exists with at least the measured file count. An ABSENT directory
 *      counts 0, and every floor is >= 1 (enforced by validateInstallClaims), so "missing" fails
 *      rather than passing vacuously. That is the exact trap that sank a previous attempt at this
 *      item: a helper returning 0 for a missing path feeding a non-empty assertion.
 *   3. content, not identity. A count and a filename survive a stale or truncated copy, so each dir
 *      claim also carries either `verbatim_subset_of` (every file under the repo source dir must
 *      appear in the emitted dir with an identical SHA-256) or explicit byte/substring probes.
 *   4. every asset kind a record says the harness does NOT get is absent from the emitted tree AND
 *      absent from that record's own supported_assets prose. This is the assertion that would have
 *      caught the copilot 'project-local skills' claim.
 *   5. no record mentions MCP anywhere in supported_assets, and no emitted tree contains an MCP
 *      config — the two halves of the same fact, so removing either the claim or the check is not
 *      enough to make this pass.
 *   6. the shared .claude/ mirror is byte-identical across all five non-claude harnesses (SHA-256 of
 *      the sorted per-file digest list, not a count), holds only commands/ and agents/, and its
 *      measured size matches the numbers written in the doc's mirror block. Claude's own .claude/ is
 *      asserted to be a DIFFERENT, larger tree so the mirror can never be mistaken for it.
 *
 * HERMETIC: nothing here reads .planning/ or any *.db. It installs from REPO_ROOT into scratch dirs,
 * so it passes on `git clone --no-hardlinks . tmp` with node_modules symlinked (verified).
 */
'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const INSTALLER = path.join(REPO_ROOT, 'bin', 'install.js');
const COMPLIANCE = path.join(REPO_ROOT, 'bin', 'installer', 'harness-adapter-compliance.js');
const DOC = path.join(REPO_ROOT, 'docs', 'architecture', 'harness-adapter-compliance.md');

const { ADAPTER_RECORDS, validateAdapterRecords } = require(COMPLIANCE);
const { RUNTIMES } = require(path.join(REPO_ROOT, 'bin', 'installer-core.js'));

const MIRROR_BLOCK_START = '<!-- harness-adapter-compliance:mirror-start -->';
const MIRROR_BLOCK_END = '<!-- harness-adapter-compliance:mirror-end -->';

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursive list of FILE paths relative to `dir`. Returns [] when `dir` is missing — which is safe
 * here only because every consumer either compares against a floor of >= 1 (so 0 fails) or is
 * asserting absence. No assertion in this file treats [] as a pass.
 */
function listFiles(dir, base = dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, base, out);
    else if (e.isFile()) out.push(path.relative(base, p));
  }
  return out;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** SHA-256 over the sorted "<relpath> <digest>" list — a content fingerprint of a whole tree. */
function treeFingerprint(dir) {
  const lines = listFiles(dir).sort().map((rel) => `${rel} ${sha256(path.join(dir, rel))}`);
  return crypto.createHash('sha256').update(lines.join('\n')).digest('hex');
}

function totalBytes(dir) {
  return listFiles(dir).reduce((sum, rel) => sum + fs.statSync(path.join(dir, rel)).size, 0);
}

const sourceHashCache = new Map();
function sourceHashes(relDir) {
  if (!sourceHashCache.has(relDir)) {
    const abs = path.join(REPO_ROOT, relDir);
    const map = new Map();
    for (const rel of listFiles(abs)) map.set(rel, sha256(path.join(abs, rel)));
    sourceHashCache.set(relDir, map);
  }
  return sourceHashCache.get(relDir);
}

const installable = ADAPTER_RECORDS.filter((r) => r.install_claims !== null);
/** id -> { project, home } for one confined install per installable record. */
const installs = new Map();
const scratchRoots = [];

function installAll() {
  for (const record of installable) {
    const runtime = record.install_claims.runtime;
    const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `mf-emit-${runtime}-`)));
    scratchRoots.push(scratch);
    const project = path.join(scratch, 'project');
    const home = path.join(scratch, 'home');
    fs.mkdirSync(project, { recursive: true });
    fs.mkdirSync(home, { recursive: true });
    fs.writeFileSync(path.join(project, 'package.json'),
      JSON.stringify({ name: 'emit-probe', version: '1.0.0' }, null, 2));

    // HOME confined: bin/installer-core.js:835 registers the project through os.homedir(), so an
    // unconfined run appends to the developer's real ~/.mindforge/registry.json.
    const r = spawnSync(process.execPath, [INSTALLER, `--${runtime}`, '--local'], {
      cwd: project, encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: home, CI: '1' },
    });
    installs.set(record.id, { project, home, status: r.status, stderr: r.stderr || '', stdout: r.stdout || '' });
  }
}

function cleanupAll() {
  for (const dir of scratchRoots) fs.rmSync(dir, { recursive: true, force: true });
}

// ── 1. scope is pinned to the installer's own runtime list ───────────────────

test('the records are structurally valid', () => {
  assert.deepStrictEqual(validateAdapterRecords(), [],
    'ADAPTER_RECORDS must validate, including install_claims shape');
});

test('every installer runtime has install_claims, and only non-runtimes may be null', () => {
  const claimed = installable.map((r) => r.install_claims.runtime).sort();
  const runtimeKeys = Object.keys(RUNTIMES).sort();
  assert.deepStrictEqual(claimed, runtimeKeys,
    'install_claims.runtime values must be exactly Object.keys(RUNTIMES) — a harness with no claims '
    + 'is a harness this gate does not check');

  for (const record of ADAPTER_RECORDS.filter((r) => r.install_claims === null)) {
    assert.ok(!Object.prototype.hasOwnProperty.call(RUNTIMES, record.id),
      `${record.id} has null install_claims but IS an installer runtime — it must be asserted`);
  }
});

// ── 2/3. claimed assets are present, with content checked ────────────────────

for (const record of installable) {
  const { install_claims: claims } = record;

  test(`${record.id}: the install succeeds and writes ${claims.base_dir}/`, () => {
    const got = installs.get(record.id);
    assert.strictEqual(got.status, 0,
      `install --${claims.runtime} --local exited ${got.status}: ${got.stderr.slice(0, 500)}`);
    const base = path.join(got.project, claims.base_dir);
    assert.ok(fs.existsSync(base) && fs.statSync(base).isDirectory(),
      `${claims.base_dir}/ was not created`);
  });

  test(`${record.id}: every claimed entry file is present and non-trivial`, () => {
    const { project } = installs.get(record.id);
    for (const rel of claims.entry_files) {
      const abs = path.join(project, rel);
      assert.ok(fs.existsSync(abs), `claimed entry file ${rel} is absent`);
      const body = fs.readFileSync(abs, 'utf8');
      assert.ok(body.length > 500, `${rel} is only ${body.length} bytes — not a real entry file`);
      assert.ok(body.includes('MindForge'), `${rel} does not mention MindForge`);
    }
  });

  test(`${record.id}: every claimed asset is emitted, with content verified`, () => {
    const { project } = installs.get(record.id);

    for (const entry of claims.emits) {
      if (entry.file) {
        const abs = path.join(project, entry.file);
        assert.ok(fs.existsSync(abs), `claimed file ${entry.file} (${entry.asset}) is absent`);
        const body = fs.readFileSync(abs, 'utf8');
        for (const needle of entry.contains) {
          assert.ok(body.includes(needle),
            `${entry.file} (${entry.asset}) does not contain ${JSON.stringify(needle)}`);
        }
        continue;
      }

      const abs = path.join(project, entry.dir);
      const emitted = listFiles(abs);
      assert.ok(emitted.length >= entry.min_files,
        `${entry.asset}: ${entry.dir} holds ${emitted.length} files, claimed floor ${entry.min_files}`);

      if (entry.verbatim_subset_of) {
        const expected = sourceHashes(entry.verbatim_subset_of);
        // The vacuity guard for the loop below: an EMPTY source map would iterate zero times and
        // report success without comparing a single byte. It is not compared against min_files —
        // the emitted dir may legitimately hold more than the source (claude's hooks dir is 16
        // files: 11 copied from .agent/hooks plus 5 added by REG-01).
        assert.ok(expected.size > 0,
          `source ${entry.verbatim_subset_of} holds no files — the verbatim check would be vacuous`);
        const missing = [];
        const differing = [];
        for (const [rel, digest] of expected) {
          const target = path.join(abs, rel);
          if (!fs.existsSync(target)) { missing.push(rel); continue; }
          if (sha256(target) !== digest) differing.push(rel);
        }
        assert.deepStrictEqual(missing, [],
          `${entry.asset}: ${missing.length} file(s) from ${entry.verbatim_subset_of} missing in ${entry.dir}`);
        assert.deepStrictEqual(differing, [],
          `${entry.asset}: ${differing.length} file(s) in ${entry.dir} differ byte-wise from ${entry.verbatim_subset_of}`);
      }

      for (const probe of entry.probes || []) {
        const target = path.join(abs, probe.file);
        assert.ok(fs.existsSync(target), `${entry.asset}: probe file ${entry.dir}/${probe.file} is absent`);
        if (probe.identical_to) {
          assert.strictEqual(sha256(target), sha256(path.join(REPO_ROOT, probe.identical_to)),
            `${entry.dir}/${probe.file} is not byte-identical to ${probe.identical_to}`);
        }
        for (const needle of probe.contains || []) {
          assert.ok(fs.readFileSync(target, 'utf8').includes(needle),
            `${entry.dir}/${probe.file} does not contain ${JSON.stringify(needle)}`);
        }
      }
    }
  });

  // ── 4. what the record says the harness does NOT get ──────────────────────

  test(`${record.id}: directories the record calls absent really are absent`, () => {
    const { project } = installs.get(record.id);
    if (claims.absent_dirs.length === 0) {
      // claude is the only harness with nothing to disclaim; assert that, so an emptied list on any
      // other harness is a failure rather than a silently skipped check.
      assert.strictEqual(claims.runtime, 'claude',
        `${record.id} declares no absent_dirs — only the claude runtime may, since it declares every subdir key`);
      return;
    }
    for (const { asset, dir } of claims.absent_dirs) {
      const abs = path.join(project, dir);
      assert.ok(!fs.existsSync(abs),
        `record says ${record.id} gets no ${asset}, but ${dir} exists with ${listFiles(abs).length} file(s)`);
    }
  });

  test(`${record.id}: asset kinds with no harness surface are absent AND unclaimed`, () => {
    const { project } = installs.get(record.id);
    if (claims.no_harness_surface_for.length === 0) {
      assert.strictEqual(claims.runtime, 'claude',
        `${record.id} lists no missing asset kinds — only claude may, it is the only harness with a settings.json`);
      return;
    }
    for (const label of claims.no_harness_surface_for) {
      const abs = path.join(project, claims.base_dir, label);
      assert.ok(!fs.existsSync(abs),
        `record says ${record.id} has no ${label} surface, but ${claims.base_dir}/${label} exists`);

      const pattern = new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const offenders = record.supported_assets.filter((a) => pattern.test(a));
      assert.deepStrictEqual(offenders, [],
        `${record.id} receives no ${label} yet supported_assets advertises it: ${JSON.stringify(offenders)}`);
    }
  });
}

// ── 5. no MCP config is claimed, because none is emitted ─────────────────────

test('no record advertises an MCP surface', () => {
  for (const record of ADAPTER_RECORDS) {
    const offenders = record.supported_assets.filter((a) => /mcp/i.test(a));
    assert.deepStrictEqual(offenders, [],
      `${record.id} advertises ${JSON.stringify(offenders)}, but the installer emits no MCP config`);
  }
});

test('no install emits an MCP config', () => {
  for (const record of installable) {
    const { project } = installs.get(record.id);
    const stray = listFiles(project).filter((rel) => path.basename(rel) === '.mcp.json');
    assert.deepStrictEqual(stray, [], `${record.id} emitted an .mcp.json: ${stray.join(', ')}`);

    for (const rel of listFiles(project).filter((r) => path.basename(r) === 'settings.json')) {
      const parsed = JSON.parse(fs.readFileSync(path.join(project, rel), 'utf8'));
      assert.ok(!Object.prototype.hasOwnProperty.call(parsed, 'mcpServers'),
        `${record.id}: ${rel} declares mcpServers`);
    }
  }
});

// ── 6. the shared .claude/ mirror ────────────────────────────────────────────

test('the shared .claude/ mirror is byte-identical across every non-claude harness', () => {
  const shared = installable.filter((r) => r.install_claims.claude_mirror === 'shared');
  assert.ok(shared.length >= 5, `expected 5 shared-mirror harnesses, found ${shared.length}`);

  const seen = new Map();
  for (const record of shared) {
    const mirror = path.join(installs.get(record.id).project, '.claude');
    assert.ok(fs.existsSync(mirror), `${record.id} wrote no .claude/ mirror`);
    seen.set(record.id, treeFingerprint(mirror));
  }
  const distinct = new Set(seen.values());
  assert.strictEqual(distinct.size, 1,
    `the mirror differs between harnesses: ${JSON.stringify([...seen])}`);
});

test('no command is destroyed by the other namespace — both sources survive byte-for-byte', () => {
  // THE DEFECT. `.agent/mindforge` and `.agent/forge` were both written into the runtime's single
  // commands directory under their BARE filenames, forge second. `.agent/forge` holds exactly three
  // files and all three collide, so forge won every time. Measured on a real --claude --local:
  //   help.md 33 -> 11 lines, init-project.md 170 -> 36, plan-phase.md 131 -> 34. 253 lines gone,
  // silently, on every install. The same bug inflated the announced count: both sources were summed,
  // so the installer said 224 commands while 221 landed.
  //
  // Asserted as a PROPERTY — every installed command matches some source byte-for-byte, and every
  // colliding basename appears in both variants somewhere — rather than as a check on the naming
  // scheme. A future change to where forge lands should not have to touch this test; a change that
  // loses a file must fail it.
  const mindforgeSrc = sourceHashes(path.join('.agent', 'mindforge'));
  const forgeSrc = sourceHashes(path.join('.agent', 'forge'));

  // NON-VACUITY: the whole defect depends on these basenames overlapping. If they ever stop
  // overlapping this test would pass for an unrelated reason, so make the premise fail loudly.
  const overlap = [...forgeSrc.keys()].filter((f) => mindforgeSrc.has(f)).sort();
  assert.ok(overlap.length > 0,
    'no basename is shared between .agent/mindforge and .agent/forge, so this test no longer '
    + 'exercises the collision it was written for. Either the sources were reorganised — delete '
    + 'this test and say why — or sourceHashes() stopped reading them.');

  for (const record of installable) {
    const runtime = record.install_claims.runtime;
    const cfg = RUNTIMES[runtime];
    const project = installs.get(record.id).project;

    // Search the whole runtime root, so this holds whether forge lands in a sibling directory, under
    // a prefixed filename, or somewhere a later change puts it.
    const root = path.join(project, cfg.localDir);
    const digests = new Map();          // basename -> Set(digest)
    for (const rel of listFiles(root)) {
      if (!rel.endsWith('.md')) continue;
      const base = path.basename(rel).replace(/^[a-z]+:/, '');   // antigravity prefixes with ns:
      if (!mindforgeSrc.has(base) && !forgeSrc.has(base)) continue;
      if (!digests.has(base)) digests.set(base, new Set());
      digests.get(base).add(sha256(path.join(root, rel)));
    }

    for (const base of overlap) {
      const found = digests.get(base) || new Set();
      // Antigravity rewrites frontmatter on copy, so its bytes legitimately differ from source.
      // Assert the weaker but still decisive property there: BOTH copies exist, under distinct names.
      if (runtime === 'antigravity') {
        const names = listFiles(root).filter((r) => path.basename(r).endsWith(`:${base}`));
        assert.strictEqual(names.length, 2,
          `${runtime}: expected both namespaces to emit ${base}, found ${JSON.stringify(names)}`);
        continue;
      }
      assert.ok(found.has(mindforgeSrc.get(base)),
        `${runtime}: the installed ${base} does not match .agent/mindforge/${base}. The forge copy `
        + 'overwrote it — 253 lines across three flagship commands were lost this way.');
      assert.ok(found.has(forgeSrc.get(base)),
        `${runtime}: .agent/forge/${base} did not land anywhere. Fixing the overwrite must not drop `
        + 'the other namespace instead — that is the same defect pointing the other way.');
    }
  }
});

test('the mirror carries only commands/ and agents/ — so copilot gets no skills on a surface IT reads', () => {
  // THE NAME IS THE ASSERTION HERE, AND ITS FIRST VERSION WAS FALSE. It read "so copilot receives zero
  // skills", which is not what this test checks and not what the installer does: the same copilot
  // install carries 232 SKILL.md files under .mindforge/skills/. The assertion below was always
  // correctly scoped to .github/ and the mirror; only the name overreached — which is worse than a weak
  // assertion, because a reader trusts the name and stops there. Measured on a real
  // `--copilot --local`: .github/skills 0, .claude/skills 0, .mindforge/skills 232 SKILL.md / 322 files.
  for (const record of installable.filter((r) => r.install_claims.claude_mirror === 'shared')) {
    const mirror = path.join(installs.get(record.id).project, '.claude');
    const top = fs.readdirSync(mirror).sort();
    assert.deepStrictEqual(top, ['agents', 'commands'],
      `${record.id}: the .claude/ mirror holds ${JSON.stringify(top)}`);
  }

  const copilot = installs.get('copilot').project;
  const skillFiles = listFiles(path.join(copilot, '.claude', 'skills'))
    .concat(listFiles(path.join(copilot, '.github', 'skills')));
  assert.deepStrictEqual(skillFiles, [],
    'a copilot install must receive zero harness-surface skills, in .github/ or in the mirror');
});

test('the copilot install DOES receive the shared .mindforge skill and persona trees', () => {
  // The positive half, and it is what stops the negative half above from being read as "no skills
  // anywhere". Two absence assertions and no presence assertion is how a scoped truth decays into a
  // false absolute in the next person's summary — it already did once, in this patch.
  //
  // Asserted as a floor rather than an exact count so adding a skill does not fail the suite, but a
  // floor with a real number is still enough to catch the tree vanishing.
  const copilot = installs.get('copilot').project;
  const skillDocs = listFiles(path.join(copilot, '.mindforge', 'skills'))
    .filter((f) => f.endsWith('SKILL.md'));
  assert.ok(skillDocs.length >= 200,
    `the shared .mindforge/skills tree must reach a copilot install; found ${skillDocs.length} SKILL.md `
    + 'files (measured 232 at the time this was written). If this is 0, the shared framework tree stopped '
    + 'being copied and the "no Copilot-readable skills" finding has become a much bigger one.');

  const personas = listFiles(path.join(copilot, '.mindforge', 'personas'));
  assert.ok(personas.length >= 200,
    `the shared .mindforge/personas tree must reach a copilot install; found ${personas.length} files `
    + '(measured 218)');
});

test('the claude install writes its own, larger .claude/ — not the mirror', () => {
  const claudeTree = path.join(installs.get('claude-code').project, '.claude');
  const mirrorTree = path.join(installs.get('cursor').project, '.claude');
  const claudeCount = listFiles(claudeTree).length;
  const mirrorCount = listFiles(mirrorTree).length;
  assert.ok(claudeCount > mirrorCount,
    `claude .claude/ (${claudeCount}) must be larger than the mirror (${mirrorCount})`);
  assert.notStrictEqual(treeFingerprint(claudeTree), treeFingerprint(mirrorTree),
    'the claude install and the cross-IDE mirror must be different trees');
  assert.ok(fs.existsSync(path.join(claudeTree, 'settings.json')),
    'only the claude install registers hooks, and only it gets a settings.json');
});

test('the doc mirror block states the measured size', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  const start = doc.indexOf(MIRROR_BLOCK_START);
  const end = doc.indexOf(MIRROR_BLOCK_END);
  assert.ok(start >= 0 && end > start, 'the mirror measurement block markers are missing from the doc');
  const block = doc.slice(start + MIRROR_BLOCK_START.length, end);

  // Only the MIRROR size is pinned to the doc. The mirror is commands + subagents, all tracked, so
  // it is reproducible from a clean clone. The claude tree deliberately is NOT pinned to a number:
  // the installer's memory loader creates gitignored files under the source .mindforge/memory/
  // (pattern-library.jsonl, sync-manifest.json), so a claude install measures 973 files from a clean
  // clone and 975 from a checkout somebody already installed from. Pinning that number would be a
  // test depending on untracked files. Its relationship to the mirror is asserted above instead.
  const mirror = path.join(installs.get('cursor').project, '.claude');
  const files = listFiles(mirror).length;
  const bytes = totalBytes(mirror);
  assert.ok(block.includes(`${files} files / ${bytes} bytes`),
    `the mirror block must state the measured size "${files} files / ${bytes} bytes"`);
});

// ── runner ───────────────────────────────────────────────────────────────────

installAll();
try {
  for (const { name, fn } of tests) {
    try {
      fn();
      passed += 1;
      console.log(`  ✓ ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`  ✗ ${name}\n    ${error.message}`);
    }
  }
} finally {
  cleanupAll();
}

console.log(`\nharness-emitted-tree: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
