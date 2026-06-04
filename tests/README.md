# MindForge Tests

Plain-Node characterization & regression tests. No Jest/Mocha — each file is a
self-contained CommonJS script that registers cases with a small `test(name, fn)`
collector and runs them via an async runner that prints `✅`/`❌` and exits
non-zero on failure.

## Running

```bash
# Run everything (auto-discovers tests/*.test.js)
node tests/run-all.js

# Run a subset by filename substring
node tests/run-all.js --filter=subagent-import
node tests/run-all.js --filter=security,audit

# Run a single file directly
node tests/subagent-import.test.js
```

The runner (`run-all.js`) globs every `tests/*.test.js`, runs each with the repo
root as `cwd`, and aggregates pass/fail. **New `*.test.js` files are picked up
automatically — no registration step.** A file whose first line is
`// @skip: reason` is skipped.

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
