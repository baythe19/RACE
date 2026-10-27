# ADR-003 — Admin Authentication

**Date:** 2026-09-05
**Status:** Active

## Context

The `Admin` Mongoose model exists but is unused for authentication. Admin login credentials are hardcoded in a config file.

## Decision

Admin auth remains env-hardcoded via `backend/src/config/hardcoded-admin.ts`. The `Admin` mongoose model is not used for login validation.

## Rationale

This was the inherited design. Changing it requires a full admin auth migration.

## Consequences

- Do not attempt to look up admin credentials in MongoDB — they live in env + hardcoded-admin.ts.
- If the user asks to add admin users, this ADR must be revisited first.
- Admin JWT role constants are in `backend/src/auth/src/roles.ts`.

## Affected Areas

`backend/src/config/hardcoded-admin.ts`, `backend/src/middleware/src/adminAuth.ts`, `backend/src/controller/src/admin/`.
