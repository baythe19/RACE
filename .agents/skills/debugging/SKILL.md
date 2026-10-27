---
name: debugging
description: "RACE debugging workflow. Load when encountering a bug, unexpected behavior, or test failure."
---

# Debugging

> **Thin wrapper** — full systematic process is in `.cursor/skills/systematic-debugging/SKILL.md`. Load that for complex bugs. This skill provides RACE-specific quick-start.

## RACE-Specific Traps (Check First)

| Symptom | Likely cause |
|---------|-------------|
| "Booking vanished" | Admin querying `Booking`; mobile wrote `TowingBooking` — ADR-002 |
| Admin login fails | Credentials in `.env` + `hardcoded-admin.ts`, not MongoDB — ADR-003 |
| OTP never arrives | `SKIP_OTP_AUTH = true` in app OR Twilio trial 21608 — ADR-005 |
| API call fails on local mobile | `EXPO_PUBLIC_API_URL` not set; defaults to GCP IP |
| Type error in Express 5 | `next()` signature changed; check `@types/express` ^5 docs |
| Metro crash after navigator edit | Imported screen was removed — check import graph — ADR-007 |
| "race-service folder not found" | `owner: 'race-service'` is a string, not a path — ADR-004 |

## Quick Diagnosis Steps

```bash
# Check recent changes
git diff HEAD~3 --stat

# Check backend logs (if running)
# Use bounded excerpt — do not dump entire PM2 log

# TypeScript errors
cd backend && npm run lint 2>&1 | head -50

# Check which booking model a file uses
grep -r "TowingBooking\|DriverBooking\|Booking" backend/src/services/src/ -l
```

## When to Escalate

If the bug is non-obvious, load `.cursor/skills/systematic-debugging/SKILL.md` for the full 4-phase process (root cause → pattern → hypothesis → implementation).

Do not propose a fix before identifying root cause.
