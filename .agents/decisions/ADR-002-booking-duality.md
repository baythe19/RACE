# ADR-002 — Booking Model Duality

**Date:** 2026-09-05
**Status:** Active

## Context

The codebase has two booking systems that coexist:
1. `TowingBooking` and `DriverBooking` — used by mobile apps for actual bookings.
2. `Booking` (legacy) — still used by some admin seed and list paths.

## Decision

Do not consolidate or remove either model without explicit user instruction and a migration plan.

## Rationale

Mixing them silently causes "the booking vanished" bugs — a booking created via one model won't appear in queries against the other.

## Consequences

- Always identify which model a screen/controller targets before editing.
- Admin reports that query `Booking` will not show mobile bookings — this is a known gap.
- When adding fields (e.g., `towingMode`, `driverServiceType`), add to `TowingBooking`/`DriverBooking` — not `Booking`.

## Affected Areas

`backend/src/models/src/`, `backend/src/services/src/bookings/`, admin reports, customer app booking screens.
