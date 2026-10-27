---
name: security-review
description: "RACE security review. Load when touching auth, OTP, JWT, PII, payments, file uploads, or admin access control."
---

# Security Review

> **Thin wrapper** — full process is in `.cursor/skills/security-and-hardening/SKILL.md`. Load that for deep security audits. This provides RACE-specific quick checks.

## RACE-Specific Security Checklist

### Auth & JWT

- [ ] User JWT uses `JWT_SECRET` from `.env`; admin JWT uses `ADMIN_JWT_SECRET` — do not mix.
- [ ] `auth.ts` middleware for user routes; `adminAuth.ts` for admin routes.
- [ ] Role check: `customer | vendor | driver` for user routes; `SUPER_ADMIN | OPERATIONS_ADMIN | ...` for admin.
- [ ] Token expiry is configured — do not extend to "no expiry" without user approval.

### OTP

- [ ] `SKIP_OTP_AUTH` is intentionally `true` in dev — do not remove it without user instruction.
- [ ] Never log the raw OTP value.
- [ ] Rate-limit OTP send endpoint (already configured via `express-rate-limit`).

### Payments

- [ ] Payments are stubs — do not add real gateway keys without explicit instruction.
- [ ] Do not log card numbers, CVV, or full transaction IDs.

### File Uploads

- [ ] Validate MIME type + size in multer middleware before accepting.
- [ ] Store files in GCS (`backend/src/storage/src/`), not on the local filesystem in production.
- [ ] Serve files only to authenticated users with appropriate roles.

### Data

- [ ] Sanitize all user-supplied IDs before MongoDB queries.
- [ ] Do not return full user documents (including password hash) to clients.
- [ ] `bcryptjs` is used for password hashing — do not replace with a weaker algorithm.

### Secrets

- [ ] Never commit `.env` files.
- [ ] Never log secret values, JWT payloads, or OTP codes.
- [ ] VPS env is separate — the workspace `.env` should have local-only values.

## When to Go Deeper

For any change involving auth flows, payment integration, or admin access control: load `.cursor/skills/security-and-hardening/SKILL.md` for the full hardening checklist.
