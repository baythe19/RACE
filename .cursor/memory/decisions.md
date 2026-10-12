# Decisions

Newest first. One block per decision. Do not rewrite history — add a new block if we reverse.

## 2026-10-12 — UI/UX Consistency, Clamped Scaling & Motion Standard (ADR-010)

Adopted `.agents/rules/ui-consistency-patterns.md` and `theme/motion.ts` across mobile and web. Clamped scale (0.88–1.22x on REF_W 390), 58px header height with 104px partner logo, keyboard on-drag dismiss, Indian phone paste normalization, and post-submission route to `DriverVerificationPendingScreen` (image copy 4.png).

## 2026-09-05 — VPS env stays gitignored; snapshot is keys + errors only

Production `.env` lives in app folders for local education. Secrets never go in git or `.cursor/memory`. Sanitized findings: `docs/ops/vps-snapshot-2026-09-05.md`.

## 2026-09-05 — Unlazy is the long-task closer

Vendored `Leonxlnx/unlazy` into `.cursor/skills/unlazy/`. Use for substantial work (gates + evidence). Do not use for a one-line reply. Did not vendor obra/superpowers (TDD-first, huge); user can `/plugin-add superpowers` in Cursor if they want it globally.

Cursor chat Memories are user-local and invisible to other agents/sessions. Shared truth lives in `.cursor/memory/` and is committed on `v2.0.1-cleanup`.

## 2026-09-05 — No customer/partner web in v2

Those apps were incomplete Phase-1 copies and were never in `deploy/`. Product is 2 mobile apps + admin + backend.

## 2026-09-05 — Freeze `main` until testing

Work only on `v2.0.1-cleanup`. Do not promote to `main` until the user says testing/surety is done.

## 2026-09-05 — Do not delete in-app leftovers yet

Customer `MainNavigator` and duplicate booking screens look unused. Removing them can break Metro. Flag only until import graph is proven.
