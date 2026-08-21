# MindForge Tests

Plain-Node characterization & regression tests. No Jest/Mocha — each file is a
self-contained CommonJS script that registers cases with a small `test(name, fn)`
collector and runs them via an async runner that prints `✅`/`❌` and exits
non-zero on failure.

## Running

```bash
# Run everything (recursive auto-discovery of *.test.js under tests/)
node tests/run-all.js

# Run a subset by filename substring
node tests/run-all.js --filter=subagent-import
node tests/run-all.js --filter=security,audit

# Run a single file directly
node tests/subagent-import.test.js
```

### How discovery actually works

`run-all.js` performs a **recursive** walk from `tests/`. It is not a flat glob of
`tests/*.test.js` (it was, before v11.9.2). Precisely:

- A file is a test **iff its name ends in `.test.js`**, at any depth. Any other
  name is invisible to the runner — `run-nexus-tests.js`, `foo-test.js` and
  `test-foo.js` are all NOT discovered, no matter where they sit.
- A **directory** is pruned if its name matches `/^(tmp-|node_modules$|\.)/` —
  so `tests/tmp-graph/` and `tests/tmp-learning-test/` (scratch dirs some suites
  create, which must never contribute a phantom suite after a crashed run),
  `tests/node_modules/`, and any dot-directory. Nothing beneath a pruned
  directory is walked.
- **That prune applies to directories ONLY, never to files.** A file named
  `tmp-foo.test.js` or `.foo.test.js` IS discovered and IS run. Do not use a
  filename prefix to try to exclude a test — use `// @skip:`.
- Non-pruned subdirectories are walked to arbitrary depth, so
  `tests/governance/foo.test.js` runs. Discovered paths are relative to `tests/`,
  and `--filter` matches that whole relative path, so `--filter=governance`
  selects an entire subdirectory.
- Each test runs in its own `node` child process with the **repo root as `cwd`**
  (regardless of the test's own depth) and `NODE_ENV=test`. Results are
  aggregated and the runner exits 1 if anything failed.
- **New `*.test.js` files are picked up automatically — no registration step.**
- **An empty run is never a pass.** Zero discovered files exits **1** (`RUNNER-FLOOR`).
  It used to print `No test files found.` and exit **0**, which made a partial checkout
  of `tests/` or a discovery regression look like a green suite — and that exit
  code is what the CI coverage gate and `npm test` (the only quality step before
  `npm publish`) both read. A `--filter` that selects nothing also exits 1; pass
  `--allow-empty` if the empty selection is deliberate. `--allow-empty` does **not**
  apply to zero discovery. All of this is asserted by `run-all-floor.test.js`, which
  also holds a floor of 90 discovered files and cross-checks `discoverTests()` against
  an independently implemented walk of `tests/`.

Two directives are honoured, and only on the file's **first line**:

| Directive | Effect |
|---|---|
| `// @skip: reason` | file is not executed; counted as skipped, reason printed |
| `// @timeout: 90000` | per-file timeout in ms; the default is `60000` |

`run-all.js` is also safely requirable: it exports `{ discoverTests,
getSkipReason, getTimeoutMs }` and calls `main()` only under
`if (require.main === module)`, so `require('./run-all.js')` does **not** launch a
nested full-suite run.

## House style (match it)

- `'use strict';`, CommonJS `require`, single quotes, semicolons.
- `const assert = require('assert');` — no assertion library.
- A module-level `const tests = []; function test(name, fn){ tests.push({name, fn}); }`
  collector, plus the async runner block at the bottom that awaits each body,
  tallies `passed`/`failed`, and calls `process.exit(1)` if anything failed.
- **Concrete over abstract.** Assert literal inputs → literal outputs (e.g.
  "name `api-designer-cc` → exit 0", "exactly 154 lines"), not "works correctly".
- **The shipped code is the oracle.** Assert what it *actually* does. If a test
  uncovers a real bug, report it separately — do not weaken the assertion to make
  it green, and do not edit source to satisfy a test.

## Adding a new case to `subagent-import.test.js`

`subagent-import.test.js` covers the subagent-import feature:
`.mindforge/imported-agents.jsonl` (built by `scripts/build-subagent-index.js`)
and the security-guarded `subagent` mode of `bin/spawn-agent.js`.

To add a case, append another `test(...)` block before the runner IIFE:

```js
test('subagent mode: <describe the input> → <expected outcome>', () => {
  const { code, stdout } = runSubagent('<name-or-arg>');
  assert.strictEqual(code, 0, stdout);          // or assert.notStrictEqual for a rejection
});
```

Helpers already available in the file:

- `loadIndexEntries()` — parsed array of every non-empty JSONL entry.
- `runSubagent(arg)` — runs `node bin/spawn-agent.js subagent <arg> --dry-run`
  from the repo root and returns `{ code, stdout }` (it normalizes the non-zero
  throw from `execFileSync` so you can assert on `code`).
- `RENAMED_ON_COLLISION` — the 16 bare names that were imported with a `-cc`
  suffix because they collided with existing persona files.

When the index legitimately changes (agents added/removed), update the literal
count in the "exactly 154 non-empty lines" assertion to the new value, and add
any new collision names to `RENAMED_ON_COLLISION`.
