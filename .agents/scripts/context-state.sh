#!/usr/bin/env bash
# context-state.sh — View or update the ACTIVE.md session state.
# Usage:
#   bash .agents/scripts/context-state.sh           # view current state
#   bash .agents/scripts/context-state.sh --edit    # open in $EDITOR
# Run from repo root.

set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"

STATE_FILE=".agents/state/ACTIVE.md"

if [ "${1:-}" = "--edit" ]; then
  EDITOR="${EDITOR:-vi}"
  exec "$EDITOR" "$STATE_FILE"
fi

if [ -f "$STATE_FILE" ]; then
  echo ""
  echo "=== RACE Active State ==="
  echo "File: $STATE_FILE"
  echo "Modified: $(date -r $STATE_FILE 2>/dev/null || stat -c %y $STATE_FILE 2>/dev/null || echo 'unknown')"
  echo ""
  cat "$STATE_FILE"
else
  echo "State file not found: $STATE_FILE"
  exit 1
fi
