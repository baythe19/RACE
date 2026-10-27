---
name: race-project-map
description: Maps the RACE repo — live apps, frozen branches, reuse rules. Use when working in /workspaces/RACE, choosing a folder, or answering architecture questions.
---

# RACE project map

## Branches

- **Work:** `v2.0.1-cleanup`
- **Frozen (do not push):** `main`, `release4Aug2026`, `release/13July26`

## Live folders

| Folder | Audience | Start |
|---|---|---|
| `backend/` | API | `npm run dev` → `:3000` |
| `customer application/` | Customer mobile | `npx expo start` |
| `mobile application/` | Partner mobile | `npx expo start` |
| `race-admin/` | Admin | `npm run dev` → `:3001` |

Removed: `customerweb/`, `partnerweb/`, `web application/`, `race-service/`. Do not recreate.

`owner: 'race-service'` in Expo config and Mongo DB name `race-service` are **strings**, not folders.

## Product

Customer app books towing / driver / roadside. Partner app (vendor + driver) takes jobs. Admin operates. All hit `backend/` (`/api/v1/*`, `/api/v1/admin/*`).

## Traps

- Two booking models: `TowingBooking` + `DriverBooking` vs legacy `Booking`
- Admin login is env-hardcoded, not Mongo `Admin`
- `SKIP_OTP_AUTH = true` on both Expo login screens
- Expo apps default API IP in `app.config.js` — set `EXPO_PUBLIC_API_URL` for local
- Customer app has dual navigation leftover (`MainNavigator` unused; `AuthNavigator` still live)

See [reference.md](reference.md) for endpoints and leftover-file notes.
