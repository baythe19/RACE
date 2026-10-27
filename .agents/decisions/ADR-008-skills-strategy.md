# ADR-008 — Skills Strategy

**Date:** 2026-09-05
**Status:** Active

## Context

Several skill packs were evaluated during initial setup (Unlazy, Superpowers, etc.).

## Decision

- **Unlazy** is vendored (`.cursor/skills/unlazy/`) — use for multi-part tasks requiring gates.
- **Superpowers TDD pack** is NOT vendored — TDD-always conflicts with empty `__tests__` directory and would mandate tests before any code.
- Complementary skills (brainstorming, systematic-debugging, verification-before-completion, requesting-code-review, security-and-hardening) are all vendored.
- New `.agents/skills/` skills are created for RACE-specific workflows.

## Rationale

Superpowers' TDD mandate clashes with the current reality of empty test infrastructure. Skills should help, not block.

## Consequences

- Do not add the full Superpowers pack.
- If user wants Superpowers globally, they use `/plugin-add superpowers` in Cursor — that is their choice.
- Verification is done via `tsc --noEmit`, `npm run lint`, and one-off audit scripts.

## Affected Areas

`.cursor/skills/`, `.agents/skills/`.
