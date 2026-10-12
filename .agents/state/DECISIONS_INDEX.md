# RACE — Decisions Index

> One-line summaries. Load individual ADRs only when relevant to the current task.

| ID | Title | Date | Status |
|----|-------|------|--------|
| [ADR-001](../decisions/ADR-001-branch-strategy.md) | Work branch is `v2.x-development`; freeze `main` + old releases | 2026-09-05 | Active |
| [ADR-002](../decisions/ADR-002-booking-duality.md) | Two booking models: `TowingBooking`/`DriverBooking` vs legacy `Booking` | 2026-09-05 | Active |
| [ADR-003](../decisions/ADR-003-admin-auth.md) | Admin auth is env-hardcoded; `Admin` mongoose model not used for login | 2026-09-05 | Active |
| [ADR-004](../decisions/ADR-004-no-web-portals.md) | No customer/partner web portals in v2; mobile-only product | 2026-09-05 | Active |
| [ADR-005](../decisions/ADR-005-otp-skip-flag.md) | `SKIP_OTP_AUTH = true` gated; real SMS configured but not enabled | 2026-09-05 | Active |
| [ADR-006](../decisions/ADR-006-admin-state.md) | Admin uses Zustand + TanStack Query, not Redux | 2026-09-05 | Active |
| [ADR-007](../decisions/ADR-007-leftover-screens.md) | Do not delete leftover screens without an import graph | 2026-09-05 | Active |
| [ADR-008](../decisions/ADR-008-skills-strategy.md) | Unlazy for gates; complementary skills only; no Superpowers TDD pack | 2026-09-05 | Active |
| [ADR-009](../decisions/ADR-009-context-engineering.md) | Layered `.agents/` context architecture replacing flat `.cursor/` memory | 2026-10-02 | Active |
| [ADR-010](../decisions/ADR-010-ui-motion-consistency-standard.md) | UI/UX consistency, clamped scaling (0.88-1.22x), motion tokens & verification progression | 2026-10-12 | Active |

---

> To add a decision: create `ADR-NNN-slug.md` in `.agents/decisions/` and add a row here.
