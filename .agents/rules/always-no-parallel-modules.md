---
name: race-no-parallel-modules
description: "always_on: Reuse existing code; no parallel implementations"
activation: always_on
---

# No Parallel Modules

- Search the repo first. If a service, screen, hook, or validator already exists: **use it, fix it, or extend it**.
- Do not add a second copy of anything.
- Do not reintroduce deleted apps: `customerweb/`, `partnerweb/`, `web application/`, `race-service/`.
- Do not delete files that look unused — flag them; delete only with import graph proof and user approval.
- Match existing patterns:
  - Backend: `controller → service → model`
  - Mobile: React Navigation + existing API clients
  - Admin: `@race/api` + Zustand + TanStack Query
