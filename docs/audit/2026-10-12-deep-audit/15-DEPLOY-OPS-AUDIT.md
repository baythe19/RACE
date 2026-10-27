# 15 — Deploy, CI & Ops Audit

**Added in the self-review pass (`02-§6`).** The first version of this audit covered code, data, security and clients
but never looked at how the thing ships. This document closes that gap.

Confidence: **[V]** verified from files/scripts in this repo · **[O]** inventory/grep · **[I]** inferred · **[X]** not verifiable here (no VM/CI/browser).

---

## 1. What actually exists [V]

| Artefact | Size | What it does |
|----------|------|--------------|
| `deploy/gcp-vm-setup.sh` | 261 lines | Root bootstrap of a fresh Debian/Ubuntu VM: `race` user, Node 20, MongoDB, Redis, PM2, nginx |
| `deploy/deploy-backend.sh` | 54 lines | `npm ci` → `npm run build` → `npm run seed` → `npm prune --omit=dev` → `pm2 start|restart` → `pm2 save` |
| `deploy/deploy-admin.sh` | 66 lines | Builds `race-admin`, writes an nginx site, serves `apps/admin-web/dist` on port **3001** |
| `deploy/ecosystem.config.cjs` | 25 lines | PM2 app `race-api`, `dist/index.js`, `fork`, 1 instance, `max_memory_restart: 512M`, log files under `backend/logs/` |
| `deploy/setup-admin-nginx.sh` | 9 lines | Optional `ufw allow 3001/tcp` |
| `mobile application/eas.json`, `customer application/eas.json` | — | `development` / `preview` / `production` build profiles; Android submit key configured |

| Infrastructure choice | Verified state |
|----------------------|----------------|
| API exposure | nginx on port **80** → `proxy_pass http://127.0.0.1:3000` (`gcp-vm-setup.sh:166-191`), `default_server`, `server_name _` |
| Admin panel | nginx on port **3001**, SPA fallback `try_files $uri $uri/ /index.html` |
| MongoDB | local `mongod` on `127.0.0.1:27017`, DB `race-service` |
| Redis | local `redis-server` on `127.0.0.1:6379` |
| Process manager | PM2, single fork process, `autorestart: true`, restarts on deploy |
| CI | **none** — `.github/workflows` does not exist |
| Containers | **none** — no `Dockerfile`, no compose file |
| Secrets | hand-copied `.env` files on the VM; 4 `.env.example` files are tracked, **no `.env` is tracked** (`02-V-16`) |

Everything runs on **one VM**: reverse proxy + API + admin panel + MongoDB + Redis.

## 2. What the deploy path actually does [V]

```
git pull on VM
  → bash deploy/deploy-backend.sh
      npm ci
      npm run build            # tsc
      npm run seed             # tsx src/database/src/seed.ts   ← runs in ALL environments, including production
      npm prune --omit=dev
      pm2 restart race-api --update-env   (or pm2 start on first run)
      pm2 save
  → "curl http://localhost/health" is *printed*, never executed
```

`seed.ts` is **not read-only**: it calls `upsertMany` for the service catalog (idempotent ✅) and also

```ts
await UserModel.deleteMany({ mobileNumber: { $regex: /^\+919876543/ } });
await UserModel.deleteMany({ mobileNumber: { $regex: /^98765432[12][0-9]$/ } });
```

so **every production deploy deletes users whose number matches those patterns** and then re-ensures indexes.

## 3. Findings

| ID | Sev | Finding | Evidence | Impact |
|----|-----|---------|----------|--------|
| OPS-1 | 🔴 High | **Production deploy runs a destructive `deleteMany`** on `users` (and seeds catalog data) on every deploy | `deploy-backend.sh:44-46`, `database/src/seed.ts:76-82` | A real customer whose number happens to match the regex is deleted at deploy time; there is no dry-run, no confirm, no env guard |
| OPS-2 | 🔴 High | **No TLS anywhere.** API is plain HTTP on port 80; admin panel is plain HTTP on 3001 | `gcp-vm-setup.sh:166-173`, `deploy-admin.sh:44-56`; no `certbot`/`ssl`/`letsencrypt` anywhere | Admin password (`Admin@123`, BUG-04), JWTs, OTPs and KYC document URLs travel unencrypted — disqualifying for real users |
| OPS-3 | 🔴 High | **No CI, no staging, no automated gate.** Backend `package.json` has **no `test` script**; the 2 existing test files cannot run (`02-V-19`, BUG-36) | `.github/workflows` absent; `backend/package.json` scripts | Every change ships on trust; regressions are found in production |
| OPS-4 | 🟠 Medium | **Deploys are not zero-downtime** — single fork instance + `pm2 restart` (not `pm2 reload`) | `ecosystem.config.cjs:7-9`, `deploy-backend.sh:48-53` | Every release = an API outage window; a bad build = outage until manual rollback |
| OPS-5 | 🟠 Medium | **No backups and no restore path** for the single local MongoDB, no snapshot script, no retention policy | no `mongodump`/backup script in `deploy/` or `backend/scripts` | Disk loss or a bad migration = permanent loss of users, bookings, KYC |
| OPS-6 | 🟠 Medium | **No monitoring, alerting or log rotation.** PM2 writes unbounded logs to `backend/logs/`; nothing polls `/health` | `ecosystem.config.cjs:19-21`; no logrotate/uptime config | Disk fills → API dies; nobody is told when the API is down |
| OPS-7 | 🟠 Medium | **No migration step in the deploy path.** Schema evolution happens implicitly through Mongoose; `syncIndexes()` covers only 12 of 26 models (BUG-31) | `deploy-backend.sh` (build → seed only) | Silent data/schema drift between environments |
| OPS-8 | 🟡 Low | **Admin nginx site has no security headers, no compression/caching rules, no edge rate limit**; CORS origin must be set per environment (`CORS_ORIGIN`, BUG-15) | `deploy-admin.sh:44-56`, `backend/.env.example` | Weaker browser hardening; one mis-set env = reflected-origin CORS with credentials |
| OPS-9 | 🟡 Low | **Mobile release config is partial**: both `eas.json` files define profiles but **no `channel`** (so no EAS Update channels) and submit config exists for Android only; no iOS submit entry | `mobile application/eas.json`, `customer application/eas.json` | OTA updates and iOS store submission need decisions before release |
| OPS-10 | 🟡 Low | **Secrets are hand-managed on the VM** (`backend/.env`), not injected by any secret store; DB + API + admin share one host | `deploy-backend.sh:24-27`, `deploy/gcp-vm-setup.sh` | Rotation is manual; one compromised VM exposes everything |

**Non-findings (verified good):** MongoDB and Redis bind to localhost only ✅ · `npm ci` (not `npm install`) ✅ ·
`set -euo pipefail` in every script ✅ · Ubuntu/GCP firewall step documented in-script ✅ ·
service catalog seed is genuinely idempotent (`upsertMany`) ✅.

## 4. Ops readiness score (advisory — not part of the weighted platform score)

| Capability | IF DONE | IF NOT | Today |
|-----------|--------:|-------:|------:|
| Automated gate on every change (CI + runnable tests) | 10 | 0 | 0 |
| Encrypted transport end to end | 10 | 0 | 0 |
| Deploy is reversible, zero-downtime, seed-safe | 10 | 1 | 1 |
| Backups + tested restore | 10 | 0 | 0 |
| Monitoring, alerting, log rotation | 10 | 1 | 1 |
| Schema migration discipline | 10 | 1 | 4 |
| Secrets managed centrally | 10 | 2 | 2 |
| **Ops area (simple average)** | — | — | **1.1 / 10** |

> This area was **not** weighted in `01-SCORECARD.md` (it is currently only partly visible through
> "Backend → Observability = 6"). Recommendation: give Ops a **5–10% weight** in the next revision —
> at 1.1/10 it is now the weakest dimension on the platform, and it is what decides whether any of the
> other scores can be trusted in production.

## 5. What must exist before real users (minimum viable ops)

1. TLS on both hostnames (API + admin) with auto-renewal.
2. A deploy that cannot delete data (`OPS-1`) — seed behind an explicit flag, never in the deploy script.
3. CI that runs `tsc --noEmit` + the smoke tests on every PR (`OPS-3`).
4. Nightly `mongodump` to off-VM storage + one rehearsed restore (`OPS-5`).
5. Uptime check on `/health` + log rotation + error alerting to a human channel (`OPS-6`).
6. `pm2 reload` / second instance for restarts without downtime (`OPS-4`).

## 6. Not verified here [X]

- Actual VM state (firewall rules, running PM2 processes, nginx config on the host, installed package versions).
- Whether backups exist outside the repo by habit even though no script exists.
- Real deploy execution (would touch infrastructure — out of scope for a read-only audit).
- EAS build/submit behaviour and store credentials validity.
