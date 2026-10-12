# ADR-010: UI/UX Consistency, Clamped Scaling, and Motion Standard

- **Status:** Active
- **Date:** 2026-10-12
- **Context:**
  The RACE Partner application (Driver + Vendor) underwent a full 4-step registration implementation and alignment with `race-motion-interaction-standard`. Inconsistencies could arise across surfaces (unclamped scaling on tablets, unhandled keyboard drag dismiss, phone paste truncation bugs, and optimistic status changes).
- **Decision:**
  1. Establish single motion token source `mobile application/src/theme/motion.ts` with standard durations (`tapFeedback: 100ms`, `screenTransition: 280ms`, etc.).
  2. Clamp all viewport scaling between `0.88x` and `1.22x` against `REF_W = 390`.
  3. Enforce `keyboardDismissMode="on-drag"` and `keyboardShouldPersistTaps="handled"` on all form scroll views.
  4. Standardize phone paste sanitization via `normalizeIndianPhone`.
  5. Route registration submission to `DriverVerificationPendingScreen` (vertical status tracker) with read-only dashboard access, rather than abrupt redirect.
  6. Document patterns in `.agents/rules/ui-consistency-patterns.md` for cross-surface reuse.
- **Consequences:**
  - Guaranteed visual and behavioral consistency across future screens.
  - No broken layouts on large Android phones, foldables, or tablets.
  - Zero accidental double-tap submissions or keyboard scrolling traps.
