# RACE backend

Layered Express 5 + TypeScript. Entry: `src/index.ts`.

```
controller/src → services/src → models/src
```

Admin API: `src/controller/src/admin` + `src/services/src/admin`. There is **no** `src/modules/` folder.

Do not add a second booking stack. Mobile uses `TowingBooking` / `DriverBooking`. Legacy `Booking` is still used by some admin seed/list paths.

Payments are stubs. Admin login is env-hardcoded (`src/config/hardcoded-admin.ts`), not the `Admin` mongoose model.
