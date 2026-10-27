#!/usr/bin/env bash
# context-update.sh — Incremental context index update. Only re-indexes changed files.
# Usage: bash .agents/scripts/context-update.sh
# Run from repo root.

set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"

INDEX_FILE=".agents/state/context-index.json"

if [ ! -f "$INDEX_FILE" ]; then
  echo "No index found. Running full index..."
  bash .agents/scripts/context-index.sh
  exit 0
fi

echo "Checking for changed files since last index..."

CHANGED=0
while IFS= read -r rel; do
  [ -f "$rel" ] || continue
  CURRENT_HASH=$(sha256sum "$rel" 2>/dev/null | awk '{print $1}')
  INDEXED_HASH=$(python3 -c "
import sys,json
try:
  with open('$INDEX_FILE') as f:
    d = json.load(f)
  print(d.get('files',{}).get('$rel',{}).get('hash',''))
except: print('')
" 2>/dev/null || echo "")

  if [ "$CURRENT_HASH" != "$INDEXED_HASH" ]; then
    echo "  Changed: $rel"
    CHANGED=$((CHANGED+1))
  fi
done < <(python3 -c "
import json
with open('$INDEX_FILE') as f:
  d = json.load(f)
for k in d.get('files',{}):
  print(k)
" 2>/dev/null)

if [ "$CHANGED" -gt 0 ]; then
  echo "$CHANGED file(s) changed. Rebuilding index..."
  bash .agents/scripts/context-index.sh --quiet
  echo "Index updated."
else
  echo "No changes detected. Index is current."
fi
