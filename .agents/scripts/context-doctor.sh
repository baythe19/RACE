#!/usr/bin/env bash
# context-doctor.sh — Audit the agent context infrastructure for health issues.
# Usage: bash .agents/scripts/context-doctor.sh
# Run from the repo root.

set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"

PASS=0; WARN=0; FAIL=0
OK="✅"; WRN="⚠️ "; ERR="❌"

check() {
  local level="$1" label="$2" detail="${3:-}"
  case "$level" in
    ok)   echo "$OK  $label"; PASS=$((PASS+1)) ;;
    warn) echo "$WRN $label${detail:+ — $detail}"; WARN=$((WARN+1)) ;;
    fail) echo "$ERR $label${detail:+ — $detail}"; FAIL=$((FAIL+1)) ;;
  esac
}

echo ""
echo "=== RACE Context Doctor ==="
echo "Root: $ROOT"
echo ""

# --- AGENTS.md size ---
if [ -f "AGENTS.md" ]; then
  BYTES=$(wc -c < AGENTS.md)
  TOKENS=$(( BYTES / 4 ))
  if [ "$TOKENS" -le 2500 ]; then
    check ok "AGENTS.md size: ~${TOKENS} tokens (${BYTES} bytes)"
  elif [ "$TOKENS" -le 4000 ]; then
    check warn "AGENTS.md size: ~${TOKENS} tokens — approaching limit" "target ≤2500 tokens"
  else
    check fail "AGENTS.md size: ~${TOKENS} tokens — too large" "reduce to ≤2500 tokens"
  fi
else
  check fail "AGENTS.md missing"
fi

# --- ACTIVE.md size ---
if [ -f ".agents/state/ACTIVE.md" ]; then
  BYTES=$(wc -c < .agents/state/ACTIVE.md)
  TOKENS=$(( BYTES / 4 ))
  if [ "$TOKENS" -le 1200 ]; then
    check ok "ACTIVE.md size: ~${TOKENS} tokens"
  else
    check warn "ACTIVE.md size: ~${TOKENS} tokens — target ≤1200 tokens"
  fi
else
  check fail ".agents/state/ACTIVE.md missing"
fi

# --- Required state files ---
for f in ".agents/state/PROJECT_INDEX.md" ".agents/state/DECISIONS_INDEX.md"; do
  [ -f "$f" ] && check ok "$f exists" || check fail "$f missing"
done

# --- ADR files ---
ADR_COUNT=$(ls .agents/decisions/ADR-*.md 2>/dev/null | wc -l)
if [ "$ADR_COUNT" -ge 1 ]; then
  check ok "ADR files: $ADR_COUNT found in .agents/decisions/"
else
  check warn "No ADR files in .agents/decisions/"
fi

# --- Skills ---
SKILL_COUNT=$(find .agents/skills -name "SKILL.md" 2>/dev/null | wc -l)
CURSOR_SKILL_COUNT=$(find .cursor/skills -name "SKILL.md" 2>/dev/null | wc -l)
check ok "Skills: $SKILL_COUNT in .agents/skills/, $CURSOR_SKILL_COUNT in .cursor/skills/"

# --- Check for oversized skill files (>150 lines is a concern) ---
while IFS= read -r -d '' skill; do
  LINES=$(wc -l < "$skill")
  if [ "$LINES" -gt 300 ]; then
    check warn "Oversized skill: $skill ($LINES lines)" "consider splitting"
  fi
done < <(find .agents/skills .cursor/skills -name "SKILL.md" -print0 2>/dev/null)

# --- Rules ---
RULES_COUNT=$(ls .agents/rules/*.md 2>/dev/null | wc -l)
CURSOR_RULES=$(ls .cursor/rules/*.mdc 2>/dev/null | wc -l)
check ok "Rules: $RULES_COUNT in .agents/rules/, $CURSOR_RULES in .cursor/rules/"

# --- Check all cursor rules are alwaysApply (known over-broad) ---
ALWAYS_ON=$(grep -l "alwaysApply: true" .cursor/rules/*.mdc 2>/dev/null | wc -l)
if [ "$ALWAYS_ON" -gt 3 ]; then
  check warn ".cursor/rules: $ALWAYS_ON rules are alwaysApply:true" "consider reclassifying some as model_decision"
fi

# --- Context index ---
if [ -f ".agents/state/context-index.json" ]; then
  AGE=$(( $(date +%s) - $(date -r .agents/state/context-index.json +%s 2>/dev/null || echo 0) ))
  if [ "$AGE" -lt 86400 ]; then
    check ok "Context index: up to date (age: ${AGE}s)"
  else
    check warn "Context index: stale (age: ${AGE}s)" "run context-index.sh to refresh"
  fi
else
  check warn "Context index not found" "run .agents/scripts/context-index.sh to generate"
fi

# --- Large docs (should not be always-loaded) ---
for doc in "docs/RACE_REMAINING_WORK_AND_GAPS.md" "docs/SYSTEM_AUDIT_AND_TEST_CASES.md" "docs/client/CLIENT_DOC_VS_BUILD.md"; do
  if [ -f "$doc" ]; then
    BYTES=$(wc -c < "$doc")
    if [ "$BYTES" -gt 10000 ]; then
      check ok "Large doc: $doc ($BYTES bytes) — referenced, not preloaded"
    fi
  fi
done

# --- Git status ---
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
FROZEN="main release4Aug2026 release/13July26"
if echo "$FROZEN" | grep -qw "$BRANCH"; then
  check fail "Current branch is frozen: $BRANCH" "switch to work branch before editing"
else
  check ok "Current branch: $BRANCH (not frozen)"
fi

# --- Stale memory: check if activeContext has old branch as current (not just a reference) ---
if [ -f ".cursor/memory/activeContext.md" ]; then
  # Only warn if the old branch appears as the primary "Branch:" value, not in passing references
  BRANCH_LINE=$(grep -A2 "^## Branch" .cursor/memory/activeContext.md 2>/dev/null | grep "v2.0.1-cleanup" || true)
  if [ -n "$BRANCH_LINE" ] && ! echo "$BRANCH_LINE" | grep -q "replaces\|old\|was\|former"; then
    check warn "activeContext.md references v2.0.1-cleanup in Branch section" "update to current branch"
  fi
fi

echo ""
echo "--- Summary ---"
echo "Pass: $PASS  Warn: $WARN  Fail: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then exit 1; fi
exit 0
