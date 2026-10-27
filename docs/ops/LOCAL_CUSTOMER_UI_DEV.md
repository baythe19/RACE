# Local customer app — UI dev (no local server)

Use this when you only change **customer UI** on your laptop/phone. **Do not run `backend/` locally** — the app talks to **Render**.

---

## 1. One-time setup

```bash
cd "customer application"
npm install
cp .env.example .env   # or use the committed template below
```

### Recommended `.env` (UI screens + cloud mock catalog)

```env
EXPO_PUBLIC_API_URL=https://race-api-w361.onrender.com
EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW=true
EXPO_PUBLIC_SKIP_OTP_AUTH=false
```

| Variable | Value | Why |
|----------|--------|-----|
| `EXPO_PUBLIC_API_URL` | `https://race-api-w361.onrender.com` | Live API; **no** `/api/v1` suffix |
| `EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW` | `true` | **Continue** skips OTP/SMS; fake session for navigation |
| `EXPO_PUBLIC_SKIP_OTP_AUTH` | `false` | Skip-OTP only works if API returns `devOtp` (Render does not in prod MC mode) |

Restart Metro after any `.env` change: stop Expo, then `npm start` again.

---

## 2. Start the app

**Same machine (web / emulator):**

```bash
cd "customer application"
npm start
```

| Target | How to open |
|--------|-------------|
| **Expo Go on phone (same Wi‑Fi)** | Scan QR; URL is `exp://<your-lan-ip>:8081` |
| **Android emulator** | Press `a` in terminal (API host is Render, not `10.0.2.2`) |
| **Physical phone, different network** | `npx expo start --tunnel` (needs Expo/ngrok as in Codespace playbook) |

**URLs you care about:**

| What | URL |
|------|-----|
| Metro / Expo dev server | `http://localhost:8081` |
| Backend (already deployed) | `https://race-api-w361.onrender.com` |
| Health check | `https://race-api-w361.onrender.com/health` |

You do **not** run `http://localhost:3000` for this workflow.

---

## 3. How to move through the app (UI preview mode)

With `EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW=true`:

1. **Mobile number** → enter any valid 10-digit Indian number (or default flow) → **Continue** (no API).
2. **OTP screen** → **Continue** / verify without real code.
3. **Sign-up path** → profile wizard opens; steps can advance without full API (see `uiPreviewAuth.ts`).
4. **Sign-in path** → preview user is treated as **profile complete** → main tabs (Home, Services, …).

Public catalog calls (`/api/v1/brand`, `/api/v1/services`) still hit **Render** and show seeded mock content.

**Limitation:** Preview uses fake tokens (`ui-preview-access`). Screens that **require** a real JWT (bookings list, profile save, payments) may show errors or empty state until you switch to **real login mode** (below).

---

## 4. Real login + full mock **data** (bookings, profile, vehicles)

When you need seeded user **Rahul** (`MOCK_TESTING_PLAYBOOK.md`):

1. Set in `.env`:
   ```env
   EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW=false
   EXPO_PUBLIC_SKIP_OTP_AUTH=false
   ```
2. Restart Metro.
3. Login: mobile **`9876543299`**, OTP from **SMS** (MessageCentral on Render), or use a number you already verified in APK.
4. On Render, universal `123456` only applies when the server uses the **dev OTP path** (`FORCE_MOCK_OTP=true`), not the current production MC setup.

---

## 5. Switch back to production APK testing

```env
EXPO_PUBLIC_API_URL=https://race-api-w361.onrender.com
EXPO_PUBLIC_UI_PREVIEW_AUTH_FLOW=false
EXPO_PUBLIC_SKIP_OTP_AUTH=false
```

EAS APK builds bake the same Render URL via `eas.json` — no local `.env` on device.

---

## 6. Admin (optional, still cloud)

No local admin required: `https://race-admin-six.vercel.app/login` → `admin@raceservice.com` / `Admin@123` (see mock playbook).

---

## Related

- `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md` — Render / Vercel / EAS IDs  
- `docs/MOCK_TESTING_PLAYBOOK.md` — seeded users and OTP notes  
