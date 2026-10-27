# ADR-004 — No Web Portals in v2

**Date:** 2026-09-05
**Status:** Active

## Context

Phase 1 had incomplete web portals (`customerweb/`, `partnerweb/`, `web application/`) that were never deployed.

## Decision

These folders were deleted in v2. The product is: 2 mobile apps + admin web + backend. No customer/partner web portals.

## Rationale

Those apps were Phase 1 copies that added maintenance burden with no value.

## Consequences

- Do not recreate `customerweb/`, `partnerweb/`, or `web application/`.
- `race-service/` was also a deleted folder — `owner: 'race-service'` and the MongoDB DB name `race-service` are just strings.

## Affected Areas

Repo root.
