# Project brief

RACE is a roadside-assistance product. Vehicle owners book help; vendors/drivers take jobs; ops run an admin panel.

**Work branch:** `v2.0.1-cleanup`  
**Frozen until testing is done:** `main`, `release4Aug2026`, `release/13July26`

**Live surfaces (do not recreate deleted apps):**

- `customer application/` — customer Expo app
- `mobile application/` — partner Expo app (vendor + driver)
- `race-admin/` — admin web
- `backend/` — Express API
- `deploy/` — GCP scripts for backend + admin

Removed on v2: `customerweb/`, `partnerweb/`, `web application/`, `race-service/`.

Product detail: `docs/client/CLIENT_OVERVIEW.md`. Do not duplicate it here.
