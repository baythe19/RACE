# RACE map — extra reference

## API prefixes

| Mount | Audience |
|---|---|
| `GET /health` | Ops |
| `/api/v1/auth`, `/profile`, `/vehicles`, `/bookings/*`, `/fare`, `/sos`, `/subscriptions`, `/payments` | Customer |
| `/api/v1/vendor`, `/api/v1/driver` | Partner |
| `/api/v1/admin/*` | Admin |

Auth: `POST /api/v1/auth/send-otp`, `verify-otp`, `refresh-token`, `driver-login`.

## Leftovers — do not delete without an import graph

Customer app (`customer application/`):

- `src/navigation/MainNavigator.tsx` — not imported by `App.tsx`
- `AppNavigator` default export — unused; `MainTabNavigator` from the same file **is** live
- Duplicate bookings screens: `screens/BookingsScreen.tsx` (live) vs `screens/booking/BookingsScreen.tsx` (old navigator)
- `PlaceholderScreen.tsx`, `ForgotPasswordScreen.tsx` — not on the live root path
- Vendor signup screens **are live** via `AuthNavigator` — do not remove

Partner app is smaller and mostly wired. Admin pages in `App.tsx` are live.

Deleting “dead” files without tracing imports can break Metro / Vite at runtime. Flag them; wait for the user.

## Versions (verify in package.json, then use matching docs)

- Node 20+, Express 5, Mongoose 8, Expo **54**, React 19, React Navigation 7
