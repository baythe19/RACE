# RACE admin

Real UI: `apps/admin-web/` (Vite, port 3001). Packages: `api`, `ui`, `types`, `constants`, `config`, `utils`.

State: **Zustand + TanStack Query**, not Redux.

Talks to `http://localhost:3000/api/v1/admin/*` via `@race/api`.
