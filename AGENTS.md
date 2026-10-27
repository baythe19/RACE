# RACE — Agent Instructions

> **Always read before any non-trivial task.**
> For architecture detail, load on-demand resources (see § Context).

---

## Project Identity

RACE is a roadside-assistance platform.
**Four live surfaces:**

| Surface | Folder | Tech | Port |
|---------|--------|------|------|
| Customer mobile | `customer application/` | Expo 57 / RN 0.86 | 8081 |
| Partner mobile | `mobile application/` | Expo 57 / RN 0.86 | 8082 |
| Admin web | `race-admin/` | Vite + Turbo | 3001 |
| Backend API | `backend/` | Express 5 / TypeScript | 3000 |
| GCP deploy | `deploy/` | PM2 + nginx | — |

Deleted (do not recreate): `customerweb/`, `partnerweb/`, `web application/`, `race-service/`.

---

## Critical Constraints — Always Apply

1. **Branch discipline** — Work on the active branch only. Check `git branch --show-current`.
   Frozen branches: `main`, `release4Aug2026`, `release/13July26`. Never commit to them.
2. **No parallel modules** — Reuse existing services/screens/hooks. Do not add a second copy.
3. **Booking duality** — Mobile uses `TowingBooking` / `DriverBooking`. Legacy `Booking` is
   still used in some admin seed/list paths. Do not mix them silently.
4. **Admin auth** — Login is env-hardcoded (`backend/src/config/hardcoded-admin.ts`).
   The `Admin` Mongo model is unused for auth.
5. **OTP skip flag** — `SKIP_OTP_AUTH = true` in both Expo login screens. This is known; do not
   silently remove it without the user's instruction.
6. **Payments are stubs** — Do not assume payment gateway is real.
7. **Root `npm install`** does not install app dependencies. `cd` into each folder.

---

## Architecture Invariants

- Backend: `controller/src → services/src → models/src`. No `modules/` folder.
- Admin: Turbo monorepo. `apps/admin-web/` (Vite). Packages: `api`, `ui`, `types`, `constants`, `config`, `utils`. State: **Zustand + TanStack Query** (not Redux).
- Mobile API base: `app.config.js` defaults to a GCP IP. Local dev needs `EXPO_PUBLIC_API_URL`.
- MongoDB: DB name `race-service` (a string — not a folder that was deleted).
- Socket.IO is connected on the backend for real-time events.
- GCS is used for file uploads (`backend/src/storage/`).

---

## Context — Load On Demand

| Need | File to read |
|------|-------------|
| **Cloud prod (Render, Vercel, EAS)** | `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md` |
| Current task / session state | `.agents/state/ACTIVE.md` |
| Repo structure & entry points | `.agents/state/PROJECT_INDEX.md` |
| Past decisions (index) | `.agents/state/DECISIONS_INDEX.md` |
| Detailed decisions | `.agents/decisions/ADR-*.md` |
| Backend routes & endpoints | `backend/src/STRUCTURE.md` |
| Product spec vs build gaps | `docs/RACE_REMAINING_WORK_AND_GAPS.md` |
| Client product overview | `docs/client/CLIENT_OVERVIEW.md` |
| Mock/test playbook | `docs/MOCK_TESTING_PLAYBOOK.md` |
| System audit | `docs/SYSTEM_AUDIT_AND_TEST_CASES.md` |

---

## Memory Protocol

1. **New session** → read `.agents/state/ACTIVE.md` first.
2. **Before editing** → claim a surface in `.cursor/memory/agents-lock.md`.
3. **After milestone** → update `ACTIVE.md`; append to decisions/learnings if durable.
4. **Across sessions** — use `ACTIVE.md` + git diff, not raw conversation history.

Memory layout: `.cursor/memory/` (legacy, still valid) and `.agents/state/` (new, preferred).

---

## Skills — Load When Relevant

| Skill | When to load |
|-------|-------------|
| `.agents/skills/context-navigator/` | Orientation, file search, cold-start |
| `.agents/skills/feature-implementation/` | New feature, non-trivial change |
| `.agents/skills/debugging/` | Bug or unexpected behavior |
| `.agents/skills/testing/` | Running or writing tests/audit scripts |
| `.agents/skills/security-review/` | Auth, OTP, JWT, PII, payments |
| `.agents/skills/deployment/` | GCP VM, PM2, nginx |
| `.cursor/skills/unlazy/` | Long / multi-part task requiring gates |
| `.cursor/skills/brainstorming/` | Unclear product direction |

Do not load skills speculatively. Load only when the task matches.

---

## Rules for Context Efficiency

- Check `.agents/state/ACTIVE.md` before scanning the repo.
- Prefer `git diff` + `git status` over re-reading stable files.
- Slice large files — do not read full files unless global structure is needed.
- Keep tool output bounded: prefer error lines and stack traces, not full logs.
- Capture full logs to a temp file; give the model a summary.
- Do not re-read a file already read in this session unless it changed.

---

## Verification Expectations

- TypeScript: `npm run lint` (i.e., `tsc --noEmit`) in the touched app folder.
- Backend: `npm run lint` in `backend/`.
- Audit: `npm run seed:fresh && tsx src/scripts/comprehensive-audit.ts` in `backend/`.
- State what could not be run.
- Do not claim "done" without at least one verification step.

---

## Maintenance

```
.agents/scripts/context-doctor.sh      # audit context health
.agents/scripts/context-index.sh       # rebuild file index
.agents/scripts/context-update.sh      # incremental index update
.agents/scripts/context-stats.sh       # token / byte stats
```
