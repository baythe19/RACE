# MVP incident runbook (pilot)

Short ops steps for the first local / pilot deployments. Not a full production SRE playbook.

## If the API is down

1. `curl -sf http://localhost:3000/health` (or Render URL `/health`).
2. Check Mongo + Redis containers: `docker ps | grep race`.
3. Backend logs: `cd backend && npm run dev` — look for `[BOOT-GUARD]` or Mongo connection errors.
4. Rollback: redeploy previous Render commit or `git checkout` known-good + restart PM2/nginx on GCP (legacy).

## If bookings fail at confirm (503 payment)

- Local: set `ALLOW_STUB_PAYMENTS=true` in `backend/.env`.
- Production: expected until Razorpay is wired — use pilot policy (stub advance on staging only).

## If OTP fails

- Dev whitelist numbers `9000000001`… → OTP `123456` when `NODE_ENV=development`.
- Real numbers need `HANU_API_KEY` + `OTP_PEPPER` (≥32 chars) in production.

## If partner sees no jobs

- Customer booking must reach `CONFIRMED` (stub advance verified).
- Vendor driver online + approved; check admin vendor assignment flow.

## If customer tracking is stale

- Partner app must report GPS (`useDriverLocationReporting` on active job).
- Socket auth required — customer logged in with valid token.

## Smoke check after any deploy

```bash
cd backend && npm run mvp:smoke
cd backend && npm run lint
```

## Escalation

Document owner + phone in your team channel; this repo does not store on-call contacts.
