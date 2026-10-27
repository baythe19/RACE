---
name: deployment
description: "RACE GCP VM deployment. Load ONLY when the user explicitly asks to deploy to the production VPS."
---

# Deployment

> **Read the full procedure in `.agents/rules/manual-deployment.md`.**
> This skill is a routing stub — it points to the detailed rule.

## When to Load

Only when the user says something like:
- "deploy to the server"
- "push to production"
- "update the VPS"
- "PM2 restart"

Do NOT load this skill speculatively.

## Quick Reference

- VPS: `race-server` (GCP) — still on `release/13July26`.
- SSH: `gcloud compute ssh race-server --tunnel-through-iap`
- Backend: PM2 (`pm2 restart race-backend`)
- Admin: nginx on port 80 (build then copy to nginx root)
- Promotion requires: lint clean + audit 40/40 + user approval.

## Detailed Procedure

See `.agents/rules/manual-deployment.md` for the full step-by-step checklist.
