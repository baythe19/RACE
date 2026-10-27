#!/usr/bin/env bash
# context-stats.sh — Report context size statistics across all agent instruction files.
# Usage: bash .agents/scripts/context-stats.sh
# Run from repo root.

set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"

total_bytes=0
total_tokens=0

print_row() {
  local label="$1" bytes="$2"
  local tokens=$(( bytes / 4 ))
  printf "  %-52s %6d bytes  ~%5d tokens\n" "$label" "$bytes" "$tokens"
  total_bytes=$(( total_bytes + bytes ))
  total_tokens=$(( total_tokens + tokens ))
}

echo ""
echo "=== RACE Context Size Statistics ==="
echo ""

echo "[ Layer 0 — Always-on ]"
[ -f "AGENTS.md" ] && print_row "AGENTS.md" "$(wc -c < AGENTS.md)"

echo ""
echo "[ Layer 1 — Project Orientation ]"
for f in ".agents/state/PROJECT_INDEX.md" ".agents/state/DECISIONS_INDEX.md"; do
  [ -f "$f" ] && print_row "$f" "$(wc -c < $f)"
done

echo ""
echo "[ Layer 2 — Session State ]"
[ -f ".agents/state/ACTIVE.md" ] && print_row ".agents/state/ACTIVE.md" "$(wc -c < .agents/state/ACTIVE.md)"

echo ""
echo "[ Layer 3 — Rules ]"
for f in .agents/rules/*.md .cursor/rules/*.mdc; do
  [ -f "$f" ] && print_row "$f" "$(wc -c < $f)"
done

echo ""
echo "[ Layer 4 — Skills (.agents) ]"
for f in $(find .agents/skills -name "SKILL.md" 2>/dev/null | sort); do
  [ -f "$f" ] && print_row "$f" "$(wc -c < $f)"
done

echo ""
echo "[ Layer 4 — Skills (.cursor) ]"
for f in $(find .cursor/skills -name "SKILL.md" 2>/dev/null | sort); do
  [ -f "$f" ] && print_row "$f" "$(wc -c < $f)"
done

echo ""
echo "[ ADRs ]"
for f in $(find .agents/decisions -name "*.md" 2>/dev/null | sort); do
  [ -f "$f" ] && print_row "$f" "$(wc -c < $f)"
done

echo ""
echo "[ Large Docs (NOT preloaded — reference only) ]"
for f in "docs/RACE_REMAINING_WORK_AND_GAPS.md" "docs/SYSTEM_AUDIT_AND_TEST_CASES.md" "docs/client/CLIENT_DOC_VS_BUILD.md" "docs/client/CLIENT_FEATURES.md"; do
  if [ -f "$f" ]; then
    BYTES=$(wc -c < "$f")
    TOKENS=$(( BYTES / 4 ))
    printf "  %-52s %6d bytes  ~%5d tokens  [reference only]\n" "$f" "$BYTES" "$TOKENS"
  fi
done

echo ""
echo "---"
printf "  %-52s %6d bytes  ~%5d tokens\n" "TOTAL (preloaded layers 0-4)" "$total_bytes" "$total_tokens"
echo ""
