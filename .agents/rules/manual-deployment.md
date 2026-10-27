---
name: race-deployment
description: "manual: GCP VM deployment procedure — load only when deploying to production"
activation: manual
---

# Deployment Procedure (RACE) — MANUAL

> Load this ONLY when the user explicitly asks to deploy to the GCP VM.

## Current State

- VPS (`race-server`) is on branch `release/13July26` — NOT the current workspace code.
- Admin and backend run under PM2 on the VM.
- Admin is served by nginx on port 80; backend on port 3000.

## Pre-Deploy Checklist

1. Confirm user has explicitly approved promotion from the work branch to main/release.
2. Verify `git branch --show-current` on workspace — should be the work branch.
3. Run `npm run lint` in backend and `tsc --noEmit` in admin.
4. Run `npm run seed:fresh && tsx src/scripts/comprehensive-audit.ts` — all 40 cases must pass.
5. Review `.env` diff — do not ship dev secrets to VPS.

## Deploy Steps

See `deploy/` folder for GCP shell scripts.

1. SSH via GCP IAP: `gcloud compute ssh race-server --tunnel-through-iap`
2. Pull new code on VM.
3. Rebuild admin: `cd race-admin && npm run build`.
4. Copy admin build to nginx root.
5. Restart backend via PM2: `pm2 restart race-backend`.
6. Tail logs: `pm2 logs race-backend --lines 50`.

## Do Not

- Deploy to VM without user's explicit instruction.
- Change VPS `.env` without backing up the current one.
- Run `db:reset` on the live database without user approval.
