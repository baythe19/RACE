#!/usr/bin/env bash
# context-index.sh — Rebuild the content-addressed context index for the RACE repo.
# Indexes key source files with SHA-256 hash, size, and structural summary.
# Note: Uses set -euo pipefail; arithmetic uses $((x+1)) to avoid ((x++)) exit-1 under set -e.
# Usage: bash .agents/scripts/context-index.sh [--quiet]
# Run from repo root.

set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"

QUIET="${1:-}"
INDEX_FILE=".agents/state/context-index.json"
PREV_INDEX=""
[ -f "$INDEX_FILE" ] && PREV_INDEX=$(cat "$INDEX_FILE")

log() { [ "$QUIET" = "--quiet" ] || echo "$@"; }

# Files to index — key structural files only (not all source)
TARGETS=(
  "AGENTS.md"
  ".agents/state/ACTIVE.md"
  ".agents/state/PROJECT_INDEX.md"
  ".agents/state/DECISIONS_INDEX.md"
  "backend/src/STRUCTURE.md"
  "backend/src/index.ts"
  "backend/src/app.ts"
  "backend/package.json"
  "race-admin/turbo.json"
  "race-admin/package.json"
  "clintdoc.md"
  "docs/MOCK_TESTING_PLAYBOOK.md"
)

# Also index all ADRs
while IFS= read -r -d '' f; do
  TARGETS+=("$f")
done < <(find .agents/decisions -name "*.md" -print0 2>/dev/null)

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
INDEXED=0; SKIPPED=0; UPDATED=0

echo "{"  > "$INDEX_FILE.tmp"
echo "  \"generated\": \"$TIMESTAMP\"," >> "$INDEX_FILE.tmp"
echo "  \"files\": {" >> "$INDEX_FILE.tmp"

FIRST=1
for rel in "${TARGETS[@]}"; do
  [ -f "$rel" ] || continue

  HASH=$(sha256sum "$rel" 2>/dev/null | awk '{print $1}')
  BYTES=$(wc -c < "$rel")
  LINES=$(wc -l < "$rel")
  EXT="${rel##*.}"

  # Check if unchanged vs previous index
  PREV_HASH=""
  if [ -n "$PREV_INDEX" ]; then
    PREV_HASH=$(echo "$PREV_INDEX" | python3 -c "
import sys,json
try:
  d = json.load(sys.stdin)
  print(d.get('files',{}).get('$rel',{}).get('hash',''))
except: print('')
" 2>/dev/null || echo "")
  fi

  if [ "$PREV_HASH" = "$HASH" ]; then
    STATUS="unchanged"
    SKIPPED=$((SKIPPED+1))
  else
    STATUS="updated"
    UPDATED=$((UPDATED+1))
  fi
  INDEXED=$((INDEXED+1))

  # Brief structural summary (first non-empty, non-comment line)
  SUMMARY=$(grep -m1 "^# " "$rel" 2>/dev/null | sed 's/^# //' || echo "$rel")

  [ "$FIRST" -eq 0 ] && echo "," >> "$INDEX_FILE.tmp"
  FIRST=0

  cat >> "$INDEX_FILE.tmp" << ENTRY
    "$rel": {
      "hash": "$HASH",
      "bytes": $BYTES,
      "lines": $LINES,
      "ext": "$EXT",
      "status": "$STATUS",
      "summary": "$SUMMARY",
      "indexed": "$TIMESTAMP"
    }
ENTRY
done

echo "  }" >> "$INDEX_FILE.tmp"
echo "}" >> "$INDEX_FILE.tmp"

mv "$INDEX_FILE.tmp" "$INDEX_FILE"

log "Context index written: $INDEX_FILE"
log "Files: $INDEXED indexed ($UPDATED updated, $SKIPPED unchanged)"
log "Timestamp: $TIMESTAMP"
