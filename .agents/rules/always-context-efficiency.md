---
name: race-context-efficiency
description: "always_on: Rules for minimizing unnecessary context reads and tool output"
activation: always_on
---

# Context Efficiency

## Before reading files

1. Check `.agents/state/ACTIVE.md` — current state may answer the question.
2. Check `.agents/state/PROJECT_INDEX.md` — find the right file path without scanning.
3. Use `git diff` / `git status` to understand what changed rather than re-reading stable files.
4. If a file was already read this session and it hasn't changed: reuse that knowledge.

## File reading rules

- Read only the relevant section of large files when possible.
- Read an entire file only when:
  - The file is small (<200 lines), OR
  - Global structure is essential to the task, OR
  - The task explicitly requires whole-file semantics.

## Tool output rules

- Never dump raw logs into context — summarize: pass/fail count, error lines, stack traces.
- Capture full output to a temp file; pass a bounded summary to the model.
- For test runs: report only failures and their stack traces.
- For build output: report only errors, not warnings unless asked.

## Context budget targets (soft)

| Layer | Target |
|-------|--------|
| Always-on (AGENTS.md) | ~1-2k tokens |
| Session state (ACTIVE.md) | ≤ 1.2k tokens |
| Per-task file reading | 5-15k tokens |
| Subagent result | 0.5-1.5k tokens |
| Log output | Bounded excerpt only |
