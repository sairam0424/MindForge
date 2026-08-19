#!/usr/bin/env bash
# Verifier that cannot be fooled by a config-load failure.
#
# The trap this exists for: gitleaks exits 1 for BOTH "leak found" AND "failed to
# load config", and writes no report file in the latter case — so an exit-code
# check plus an empty-report read looks exactly like a clean scan. Every
# assertion below first proves the config LOADED, then checks the finding count.
#
# All test credentials are ASSEMBLED AT RUNTIME from a prefix + a random body, so
# this script contains no token-shaped literal of its own. (A secret-scanning
# hook correctly rejected an earlier version that did.)
set -uo pipefail
REPO="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"
CFG="${1:-$REPO/.gitleaks.toml}"

fatal() { printf '  \033[31m✖ %s\033[0m\n' "$1"; }
ok()    { printf '  \033[32m✓ %s\033[0m\n' "$1"; }

randbody() { LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$1"; }
NPM_P=npm; GH_P=github; ANT_P=sk
FAKE_NPM="${NPM_P}_$(randbody 36)"
FAKE_GH="${GH_P}_pat_$(randbody 22)_$(randbody 59)"
FAKE_ANT="${ANT_P}-ant-api03-$(randbody 95)"

# Write a payload into its OWN directory and return that directory.
#
# `gitleaks detect -s <single file>` intermittently enumerates nothing: it prints
# "scanned ~0 bytes (0)" followed by "no leaks found", which every caller below
# read as a clean scan. Measured over 400 iterations of the same fixture:
#
#     bare-file target   scanned ~0 bytes:  3
#     directory target   scanned ~0 bytes:  0
#
# So roughly 0.75% of positive cases reported MISSED spuriously, and with three
# positive cases per run this suite failed CI at random — which is how it went red
# on a commit that changed nothing in the scanner. A flaky security gate is worse
# than a slow one: it trains everyone to re-run until green. Scanning a directory
# is the reliable invocation.
fixture_dir() {
  local d; d=$(mktemp -d)
  printf '%s\n' "$1" > "$d/fixture.txt"
  printf '%s' "$d"
}

# 0 = scanned clean | 1 = scanned, leaks found | 2 = did not scan
#
# ZERO BYTES IS NOT CLEAN. gitleaks reports "no leaks found" whether it examined a
# megabyte or nothing at all, so a scan that enumerated no content used to be
# indistinguishable from a scan that found nothing — the same trap as the
# config-load failure this file was written for, one level down. Any result whose
# byte count is 0 is now "did not scan", so it can never be mistaken for a pass.
scan() {
  local out; out=$(gitleaks detect --no-git --redact -c "$CFG" -s "$1" 2>&1)
  grep -qiE 'FTL|failed to load|panic|MustCompile' <<<"$out" && return 2
  grep -qaE 'scanned ~0 bytes' <<<"$out" && return 2
  grep -qi  'no leaks found'  <<<"$out" && return 0
  grep -qiE 'leaks found:'    <<<"$out" && return 1
  return 2
}

fails=0

echo "── 0. config must LOAD (distinct from scanning clean) ──"
p=$(fixture_dir 'nothing interesting here')
scan "$p"; rc=$?
if [ $rc -eq 2 ]; then fatal "config failed to load — every result below would be meaningless"; exit 1; fi
ok "config loads and scans"

# 0b. A scan that examined NOTHING must not report clean.
#
# Pinned through the real scan() rather than by grepping this file for the guard, and placed before the
# positive cases because everything below depends on it: if a zero-byte scan can read as clean, then
# "MISSED" and "the scanner never looked" are the same result, and so are "history clean" and "history
# never scanned". Measured — the pre-fix scan() returned 0 (scanned clean) for an empty directory.
empty=$(mktemp -d)
scan "$empty"; rc=$?
rmdir "$empty" 2>/dev/null
if [ $rc -ne 2 ]; then
  fatal "a scan of an empty tree returned rc=$rc instead of DID-NOT-SCAN — a zero-byte scan is being read as a result, so every check below can pass without examining anything"
  exit 1
fi
ok "a zero-byte scan is reported as DID NOT SCAN, not as clean"

echo "── 1. real secrets MUST be caught ──"
while IFS='|' read -r label payload; do
  [ -z "$label" ] && continue
  f=$(fixture_dir "$payload")
  scan "$f"; rc=$?
  case $rc in
    1) ok "caught: $label" ;;
    0) fatal "MISSED: $label";      fails=$((fails+1)) ;;
    2) fatal "DID NOT SCAN: $label";fails=$((fails+1)) ;;
  esac
done <<EOF
npm literal token|//registry.npmjs.org/:_authToken=${FAKE_NPM}
github fine-grained PAT|tok = "${FAKE_GH}"
anthropic key|key = "${FAKE_ANT}"
EOF

echo "── 2. correct patterns must NOT be flagged ──"
while IFS='|' read -r label payload; do
  [ -z "$label" ] && continue
  f=$(fixture_dir "$payload")
  scan "$f"; rc=$?
  case $rc in
    0) ok "allowed: $label" ;;
    1) fatal "FALSE POSITIVE: $label"; fails=$((fails+1)) ;;
    2) fatal "DID NOT SCAN: $label";   fails=$((fails+1)) ;;
  esac
done <<'EOF'
env-var form|//registry.npmjs.org/:_authToken=${NPM_TOKEN}
EOF

echo "── 3. allowlists must not blind the scanner (negative controls) ──"
for src in \
  bin/engine/sre-manager.js \
  .mindforge/dynamic-workflows/scripts/api-migration.js \
  tests/knowledge-graph.test.js ; do
  [ -f "$REPO/$src" ] || { fatal "missing $src"; fails=$((fails+1)); continue; }
  f=$(mktemp -d); { cat "$REPO/$src"; printf '\nconst leaked = "%s";\n' "$FAKE_GH"; } > "$f/fixture.js"
  scan "$f"; rc=$?
  case $rc in
    1) ok "allowlist not over-broad: $src" ;;
    0) fatal "ALLOWLIST TOO BROAD — real secret missed in $src"; fails=$((fails+1)) ;;
    2) fatal "DID NOT SCAN: $src";                              fails=$((fails+1)) ;;
  esac
done

echo "── 4. full repo history must be clean ──"
hist=$(cd "$REPO" && gitleaks git --redact -c "$CFG" . 2>&1)
if grep -qiE 'FTL|failed to load|panic' <<<"$hist"; then
  fatal "history scan did not run"; fails=$((fails+1))
elif grep -qi 'no leaks found' <<<"$hist"; then
  ok "history clean ($(grep -oE '[0-9]+ commits scanned' <<<"$hist" | head -1))"
else
  fatal "history findings: $(grep -oE 'leaks found: [0-9]+' <<<"$hist" | head -1)"; fails=$((fails+1))
fi

echo
if [ "$fails" -eq 0 ]; then printf '\033[32mALL CHECKS PASSED\033[0m\n'; exit 0; fi
printf '\033[31m%s CHECK(S) FAILED\033[0m\n' "$fails"; exit 1
