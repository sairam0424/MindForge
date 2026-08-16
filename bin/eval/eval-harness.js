'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// Repo root derived from THIS file's location, never from cwd.
// bin/utils/paths.js resolves PROJECT_ROOT by walking up from process.cwd(),
// which on a consumer install lands inside node_modules — the wrong root for a
// corpus scan, and it would silently yield an empty corpus. __dirname is always
// <root>/bin/eval.
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Recall@K — fraction of relevant items found in the top-k retrieved results.
 * @param {string[]} retrieved - IDs in ranked order
 * @param {string[]} relevant - ground-truth relevant IDs
 * @param {number} k - cutoff
 * @returns {number} recall in [0, 1]
 */
function recallAtK(retrieved, relevant, k) {
  if (relevant.length === 0) return 0;
  const topK = retrieved.slice(0, k);
  const relevantSet = new Set(relevant);
  const found = topK.filter(id => relevantSet.has(id)).length;
  return found / relevant.length;
}

/**
 * nDCG (Normalized Discounted Cumulative Gain) with graded relevance.
 * @param {string[]} retrieved - IDs in ranked order
 * @param {Object.<string, number>} relevanceMap - {id: grade} where grade is 0-3
 * @param {number} k - cutoff
 * @returns {number} nDCG in [0, 1]
 */
function ndcg(retrieved, relevanceMap, k) {
  const topK = retrieved.slice(0, k);

  // DCG = Σ (2^rel_i - 1) / log2(i + 2) for i = 0..k-1
  const dcg = topK.reduce((sum, id, i) => {
    const rel = relevanceMap[id] || 0;
    return sum + (Math.pow(2, rel) - 1) / Math.log2(i + 2);
  }, 0);

  // IDCG — ideal ordering: sort all relevance grades descending, take top-k
  const idealGrades = Object.values(relevanceMap)
    .filter(g => g > 0)
    .sort((a, b) => b - a)
    .slice(0, k);

  const idcg = idealGrades.reduce((sum, rel, i) => {
    return sum + (Math.pow(2, rel) - 1) / Math.log2(i + 2);
  }, 0);

  if (idcg === 0) return 0;
  return dcg / idcg;
}

/**
 * Run a full evaluation over a golden set of queries.
 * @param {Object} opts
 * @param {Array<{query: string, relevant: string[]}>} opts.goldenSet
 * @param {function(string): string[]} opts.retriever
 * @param {number} opts.k
 * @returns {Promise<{meanRecallAtK: number, meanNDCG: number, perQuery: Array}>}
 */
async function runEval({ goldenSet, retriever, k }) {
  const perQuery = [];

  for (const { query, relevant } of goldenSet) {
    const retrieved = await Promise.resolve(retriever(query));

    // Binary relevance map: relevant items get grade 1, others 0
    const relevanceMap = {};
    for (const id of relevant) {
      relevanceMap[id] = 1;
    }

    const recall = recallAtK(retrieved, relevant, k);
    const ndcgScore = ndcg(retrieved, relevanceMap, k);

    perQuery.push({ query, recall, ndcg: ndcgScore, retrieved });
  }

  if (perQuery.length === 0) return { meanRecallAtK: 0, meanNDCG: 0, perQuery: [] };

  const meanRecallAtK = perQuery.reduce((s, q) => s + q.recall, 0) / perQuery.length;
  const meanNDCG = perQuery.reduce((s, q) => s + q.ndcg, 0) / perQuery.length;

  return { meanRecallAtK, meanNDCG, perQuery };
}

// ── Corpus + runnable golden-set gate (FTS-01) ───────────────────────────────
// Before this block the file had NO require.main guard, so the documented
// command `node bin/eval/eval-harness.js --set golden-set-retrieval.json`
// printed nothing and exited 0 — a gate that could not fail, and therefore not
// a gate. golden-set-retrieval.json and this harness had zero callers.
//
// The shipped golden set names documents by BASENAME (`audit-hash`,
// `model-router`, `stuck-detector`, …). Those ids exist nowhere in
// .mindforge/celestial.db, so recall measured against the live trace DB is 0.00
// by construction whatever the query builder does. The corpus the golden set
// actually describes is the repo's own module/skill documentation — so build it,
// index it into a THROWAWAY database under os.tmpdir(), and measure that.

const CORPUS_ROOTS = [
  { dir: 'bin', exts: ['.js'] },
  { dir: '.mindforge/skills', exts: ['.md'] },
  { dir: '.mindforge/engine', exts: ['.md'] },
  { dir: '.agent/hooks', exts: ['.js'] },
];
const CORPUS_MAX_BYTES = 20000;
const CORPUS_SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage']);

function _walk(dir, exts, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out; // a missing corpus root is reported via corpusSize, not a throw
  }
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!CORPUS_SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        _walk(p, exts, out);
      }
    } else if (exts.includes(path.extname(entry.name))) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Doc id for a corpus file: its basename, except SKILL.md, which is keyed by its
 * containing skill directory (that is the name the golden set uses).
 * @param {string} file - absolute or relative file path
 * @returns {string} document id
 */
function docIdForFile(file) {
  const base = path.basename(file, path.extname(file));
  return base === 'SKILL' ? path.basename(path.dirname(file)) : base;
}

/**
 * Enumerate the document corpus the golden set's `relevant` ids refer to.
 * @param {string} [root] - project root; defaults to REPO_ROOT
 * @returns {Map<string, {id: string, file: string, content: string}>}
 */
function buildDocCorpus(root = REPO_ROOT) {
  const corpus = new Map();
  for (const { dir, exts } of CORPUS_ROOTS) {
    for (const file of _walk(path.join(root, dir), exts, [])) {
      const id = docIdForFile(file);
      if (corpus.has(id)) continue; // first wins; basename collisions are rare
      let text = '';
      try {
        text = fs.readFileSync(file, 'utf8').slice(0, CORPUS_MAX_BYTES);
      } catch {
        continue;
      }
      const rel = path.relative(root, file);
      corpus.set(id, { id, file: rel, content: `${id} ${rel}\n${text}` });
    }
  }
  return corpus;
}

/**
 * Index the doc corpus into a throwaway VectorHub and score the golden set.
 * NEVER touches .mindforge/celestial.db — the database lives in os.tmpdir() and
 * is deleted again before this resolves.
 * @param {Object} [opts]
 * @param {string} [opts.goldenSetPath] - defaults to ./golden-set-retrieval.json
 * @param {string} [opts.root] - corpus root; defaults to REPO_ROOT
 * @param {number} [opts.k] - cutoff; defaults to 10
 * @returns {Promise<Object>} runEval metrics plus corpus/coverage diagnostics
 */
async function runGoldenSetEval(opts = {}) {
  const goldenSetPath = opts.goldenSetPath || path.join(__dirname, 'golden-set-retrieval.json');
  const root = opts.root || REPO_ROOT;
  const k = opts.k || 10;

  const golden = JSON.parse(fs.readFileSync(goldenSetPath, 'utf8'));
  const goldenSet = golden.queries || [];
  const corpus = buildDocCorpus(root);

  const relevantIds = [...new Set(goldenSet.flatMap(q => q.relevant || []))];
  const unresolved = relevantIds.filter(id => !corpus.has(id));

  const { VectorHub } = require('../memory/vector-hub');
  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mindforge-eval-'));
  const hub = new VectorHub(path.join(dbDir, 'eval-corpus.db'));
  await hub.init();
  try {
    // The hub is throwaway, so raise the autosave batch size: the default of 10
    // exports the whole growing database to disk every 10 documents, which turns
    // a 0.5 s index build into a quadratic one for no durability benefit here.
    hub._batchSize = Number.MAX_SAFE_INTEGER;
    for (const doc of corpus.values()) {
      await hub.saveKnowledge({ id: doc.id, type: 'doc', content: doc.content, source: doc.file });
    }
    const retriever = async (query) =>
      (await hub.searchKnowledge(query, { limit: k })).map(r => r.id);
    const metrics = await runEval({ goldenSet, retriever, k });
    return {
      ...metrics,
      k,
      corpusSize: corpus.size,
      relevantIdCount: relevantIds.length,
      unresolvedRelevantIds: unresolved,
      baseline: golden.baseline || null,
    };
  } finally {
    await hub.close();
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
}

module.exports = {
  recallAtK,
  ndcg,
  runEval,
  buildDocCorpus,
  docIdForFile,
  runGoldenSetEval,
};

// ── CLI ──────────────────────────────────────────────────────────────────────
// node bin/eval/eval-harness.js [--set golden-set-retrieval.json] [--k 10]
//                               [--min-recall 0.55] [--json]
// Exits 1 when mean recall@k is below --min-recall, or when any golden
// `relevant` id no longer resolves to a real document (golden-set drift).
// `npm run eval:retrieval` runs this with the committed baseline floor.
if (require.main === module) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
  };
  const setArg = flag('--set', 'golden-set-retrieval.json');
  const goldenSetPath = path.isAbsolute(setArg)
    ? setArg
    : path.join(__dirname, path.basename(setArg));
  const num = (name, fallback) => {
    const raw = flag(name, String(fallback));
    const n = Number(raw);
    // Fail closed: an unparseable threshold must never silently become 0.
    if (!Number.isFinite(n) || n < 0) {
      console.error(`[eval] ERROR: ${name} must be a non-negative number, got ${JSON.stringify(raw)}`);
      process.exit(1);
    }
    return n;
  };
  const k = Math.max(1, Math.trunc(num('--k', 10)));
  const minRecall = num('--min-recall', 0);

  runGoldenSetEval({ goldenSetPath, k })
    .then((res) => {
      if (argv.includes('--json')) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log(`[eval] corpus: ${res.corpusSize} docs · golden queries: ${res.perQuery.length} · k=${res.k}`);
        for (const q of res.perQuery) {
          console.log(`  recall=${q.recall.toFixed(3)} nDCG=${q.ndcg.toFixed(3)} hits=${q.retrieved.length}  ${q.query}`);
        }
        console.log(`[eval] mean recall@${res.k} = ${res.meanRecallAtK.toFixed(4)}`);
        console.log(`[eval] mean nDCG@${res.k}   = ${res.meanNDCG.toFixed(4)}`);
        if (res.baseline && typeof res.baseline.meanRecallAtK === 'number') {
          // Round BEFORE choosing the sign, so a difference smaller than the
          // printed precision reads as +0.0000 rather than a bogus -0.0000.
          const delta = Number((res.meanRecallAtK - res.baseline.meanRecallAtK).toFixed(4));
          console.log(`[eval] committed baseline recall@${res.baseline.k || res.k} = ${res.baseline.meanRecallAtK.toFixed(4)} (delta ${delta >= 0 ? '+' : ''}${delta.toFixed(4)})`);
        }
      }
      if (res.unresolvedRelevantIds.length > 0) {
        console.error(`[eval] FAIL: ${res.unresolvedRelevantIds.length} golden id(s) no longer resolve to a document: ${res.unresolvedRelevantIds.join(', ')}`);
        process.exit(1);
      }
      if (res.meanRecallAtK < minRecall) {
        console.error(`[eval] FAIL: mean recall@${res.k} ${res.meanRecallAtK.toFixed(4)} < --min-recall ${minRecall}`);
        process.exit(1);
      }
    })
    .catch((err) => {
      // sql.js throws bare strings for some binding errors, so an Error-shaped
      // formatter alone would print "undefined" and hide the real failure.
      const detail = (err && (err.stack || err.message)) || String(err);
      console.error(`[eval] ERROR: ${detail}`);
      process.exit(1);
    });
}
