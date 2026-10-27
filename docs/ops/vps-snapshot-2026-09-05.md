# VPS snapshot — 2026-09-05

Pulled from GCP VM `race-server` (`townow-j5hir`, `asia-south1-c`, `34.93.103.86`) via IAP SSH. **No secret values in this file.** Live `.env` copies are gitignored in the app folders.

## What is running

| Item | Fact |
|------|------|
| Git on VM | `release/13July26` @ `1cb88eb` (frozen old line — not `v2.0.1-cleanup`) |
| API process | PM2 `race-api`, online ~37d, 2 restarts, Node 20.20.2 |
| Health | `GET /health` → 200 `{ status: ok }` on **:80 and :3000** |
| Admin | nginx `:3001` → `race-admin/apps/admin-web/dist` → 200 |
| Redis | localhost, PONG |
| Local mongod | **not installed** — API uses Atlas |
| Disk | ~59% of 10G |
| Leftover on disk | `customerweb/` still on the VM (not used by nginx) |

## Env files saved locally (gitignored)

Copied to matching workspace paths:

- `backend/.env`
- `race-admin/apps/admin-web/.env`
- `customer application/.env`
- `mobile application/.env`

### Key inventory (set vs empty vs missing)

Backend on VPS has 25 keys. Current `backend/.env.example` has extra keys **not** on the VM: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_WEB_URL`, `GOOGLE_MAPS_API_KEY`, `SOS_*`.

Empty on VPS: `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, `GCS_KEY_FILE`.

Set on VPS: `NODE_ENV=production`, JWT, OTP limits, Twilio, SMTP, Redis, Mongo Atlas.

### Misconfig (do not treat as “working as designed”)

1. **Mongo database name is `test`.** `MONGODB_URI` is `mongodb+srv` to `cluster0.gai795e.mongodb.net` with **no `/dbname` path**. Startup logs: `MongoDB connected database=test`.
2. **`APP_BASE_URL` is a LAN IP** (`http://192.168.29.139:3000`), not the public VM. Leftover from a laptop deploy.
3. **`CORS_ORIGIN=*`** in production.
4. **Customer maps keys are still placeholders** (`PASTE_YOUR_KEY_HERE`). Partner app maps keys are set.
5. **API URL mismatch:** Expo apps use `http://34.93.103.86:3000`. Admin `VITE_API_URL` uses `http://34.93.103.86/api/v1` (nginx :80). Both currently respond.
6. **Node is public on :3000** as well as nginx :80. Prefer bind `127.0.0.1:3000` and only expose 80/443 later.

## Logs

Sources: `pm2 logs race-api`, `backend/logs/pm2-error.log` (1.3K), `pm2-out.log` (~22MB / 177k lines), nginx error log empty.

All-time HTTP from access logs (approx): **118914× 404**, **57860× 429**, **75× 200**, **27× 401**, **1× 502**, **1× 201**. Almost all 404/429 are internet scanners (`.env`, phpunit, metadata SSRF, `error.log`, …). Rate limit is doing its job.

### Real application issues (not scanners)

| When (UTC) | What | Notes |
|------------|------|--------|
| 2026-07-31 16:22 | `POST /api/v1/auth/send-otp` **502** | Only 5xx in the file. Twilio **21608**: trial account cannot SMS unverified numbers. Logged in `pm2-error.log`. |
| 2026-07-29 | `POST /api/v1/admin/auth/login` **401** (twice) | Failed admin login. |
| 2026-07-14 / 07-29 | refresh-token **401** | Expired/invalid admin session. |
| 2026-07-01 | Admin login 200, create vendor **201**, then some 401 on vendors/settings | Token race / refresh — worth reproducing in education env. |

Customer OTP was attempted **once** in the whole log. Almost no towing/driver booking traffic in PM2 out.

No winston `"level":"error"`. No unhandled rejection spam. nginx error log empty.

## Do not

- Commit the copied `.env` files.
- Deploy `v2.0.1-cleanup` onto this VM until the user explicitly promotes.
- Treat scanner 404s as product bugs.
- Put JWT/Twilio/SMTP/Mongo passwords in memory or client docs.
