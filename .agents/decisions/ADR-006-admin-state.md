# ADR-006 — Admin State Management

**Date:** 2026-09-05
**Status:** Active

## Context

Client documentation (CLIENT_FEATURES.md) incorrectly stated admin uses Redux. The actual codebase uses a different stack.

## Decision

Admin web (`race-admin/apps/admin-web/`) uses **Zustand** for client state and **TanStack Query** for server state. Redux is not used.

## Rationale

This was the inherited implementation. The client doc was wrong.

## Consequences

- When adding admin state: use Zustand store pattern.
- When adding data fetching: use TanStack Query hooks via `@race/api` package.
- Do not import Redux in admin.
- `@race/api` is the monorepo package for admin API calls.

## Affected Areas

`race-admin/apps/admin-web/src/`, `race-admin/packages/api/`.
