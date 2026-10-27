---
name: race-task-workflow
description: Plan-first workflow for RACE tasks. Use when the user gives a feature, bug, cleanup, or any non-trivial implementation request.
---

# RACE task workflow

Do not jump to code on a large or unclear task.

## 0. Memory

Read `.cursor/memory/activeContext.md` and `agents-lock.md`. Claim the surface you will edit. If locked, stop.

## 1. Review (repo)

- Find the live entry: customer `App.tsx` → `RootNavigator`; partner `PartnerAppNavigator`; admin `apps/admin-web/src/App.tsx`; backend `src/controller/src/index.ts`.
- Search for an existing implementation. Reuse it.

## 2. Research (internet)

- Open **version-matched** docs (Expo 54, Express 5, the library version in that app’s `package.json`).
- Confirm APIs that are easy to get wrong (Expo modules, JWT, Socket.IO, Maps).
- If docs and repo disagree, **repo wins** unless the user asked for an upgrade.

## 3. Plan

Write a short plan before editing:

- Goal and non-goals
- Files to change (existing first)
- Edge cases: roles, empty data, stub payments, OTP skip flag
- How you will verify (command or flow)

If the change is large, stop after the plan until the user confirms. New feature / unclear product change: load `.cursor/skills/brainstorming/SKILL.md` first.

## 4. Implement

- Smallest change that matches existing style.
- No new app, no extra abstraction layer, no unused files.
- Stay on `v2.0.1-cleanup`.
- Long / multi-part task: load `.cursor/skills/unlazy/SKILL.md` and write gates before claiming done.
- Auth / OTP / JWT / payments / untrusted input: also load `.cursor/skills/security-and-hardening/SKILL.md`.
- Bugs: load `.cursor/skills/systematic-debugging/SKILL.md` before proposing a fix.

## 5. Verify

- Load `.cursor/skills/verification-before-completion/SKILL.md` before claiming done.
- Typecheck the touched app (`tsc --noEmit` / `npm run lint` where it exists).
- For UI: exercise the flow if a browser/dev server is available.
- State what you could not run.
- Major change: load `.cursor/skills/requesting-code-review/SKILL.md`.

## 6. Memory

Update `.cursor/memory/activeContext.md`. Append progress/decisions/learnings if needed. Clear `agents-lock.md`.
