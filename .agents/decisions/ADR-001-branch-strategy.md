# ADR-001 — Branch Strategy

**Date:** 2026-09-05
**Status:** Active

## Context

The repo has multiple branches: `main`, `release4Aug2026`, `release/13July26`, and the work branch. The VPS runs an older release. Merging prematurely would deploy untested code.

## Decision

All agent work happens on the current development branch (`v2.x-development` or whatever branch the user has checked out). Branches `main`, `release4Aug2026`, and `release/13July26` are frozen until the user explicitly asks to promote.

## Rationale

Prevents accidental deployment of in-progress work to the live VPS.

## Consequences

- Before any commit: `git branch --show-current` — stop if on a frozen branch.
- Push only the active work branch to origin.
- The VPS may lag behind the workspace — do not assume prod matches local.

## Affected Areas

All surfaces.
