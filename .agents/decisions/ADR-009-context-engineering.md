# ADR-009 — Context Engineering Architecture

**Date:** 2026-10-02
**Status:** Active

## Context

Previous agent context was flat: one large `AGENTS.md`, four always-on `.cursor/rules/`, and skills in `.cursor/skills/`. The `.cursor/memory/` files contained stale information (wrong Expo version, wrong branch name). Rules were all `alwaysApply: true` with overlapping content.

## Decision

Introduce a layered `.agents/` context architecture:

```
Layer 0: AGENTS.md — always-on, ~1-2k tokens, no large docs
Layer 1: PROJECT_INDEX.md — repository map, load when orienting
Layer 2: ACTIVE.md — session state, load at start of each session
Layer 3: Per-task files — relevant source files only
Layer 4: Skills & ADRs — load only when relevant
Layer 5: Logs & tool output — bounded summaries only
```

`.cursor/rules/` are kept but will be reclassified over time. New rules go in `.agents/rules/` with proper activation types.

## Rationale

- Reduces always-on context from ~8-10 source files to 1 compact AGENTS.md.
- Progressive disclosure: agent fetches what it needs, not everything at startup.
- Durable state survives context compaction via ACTIVE.md.
- Decision rationale is accessible on-demand via ADRs rather than inlined.

## Consequences

- `.cursor/memory/` remains valid — it's the legacy write target for backward compat.
- New sessions should read `.agents/state/ACTIVE.md` first (it has the current branch, gaps, etc.).
- `.agents/state/` is the preferred new write location.
- Large docs (`RACE_REMAINING_WORK_AND_GAPS.md`, etc.) are referenced, never preloaded.
- Skills in `.cursor/skills/` remain valid — `.agents/skills/` adds new RACE-specific focused skills.

## Affected Areas

Root `AGENTS.md`, `.agents/`, `.cursor/memory/`, `.cursor/rules/`, `.cursor/skills/`.
