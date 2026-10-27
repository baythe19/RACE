---
name: race-backend-patterns
description: "glob:backend/** — Backend-specific engineering rules"
activation: glob
globs: ["backend/**"]
---

# Backend Patterns (RACE)

- Pattern: `controller/src/ → services/src/ → models/src/`. No `modules/` folder.
- Naming: `user.ts` (not `user.model.ts`), `auth.ts` (not `auth.middleware.ts`).
- Two booking systems: `TowingBooking`/`DriverBooking` (mobile) vs `Booking` (legacy admin). Do not mix.
- Admin auth: `hardcoded-admin.ts` + env vars. Not the `Admin` mongoose model.
- Payments are stubs — do not add real gateway code without user instruction.
- Socket.IO is on the server — prefer the existing socket setup; do not start a second instance.
- GCS storage is in `src/storage/src/` — use it for file uploads.
- Zod is available for validation — prefer it over hand-rolled validators.
- Run `npm run lint` to verify TypeScript before claiming done.
