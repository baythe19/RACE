---
name: race-auth-security
description: "model_decision: Security rules for auth, OTP, JWT, PII, payments — load when touching these"
activation: model_decision
---

# Auth & Security (RACE)

Load this when touching: OTP, JWT, login flows, payments, PII, file uploads, admin auth, role checks.

## Auth

- JWT secrets are in `.env` — never hardcode, never log.
- Admin JWT and user JWT have different secrets and role payloads — verify you are reading the right one.
- `adminAuth.ts` middleware checks admin roles. `auth.ts` checks user roles (`customer`, `vendor`, `driver`).
- Role constants: `backend/src/auth/src/roles.ts`.

## OTP

- `SKIP_OTP_AUTH = true` gates real OTP in both apps — see ADR-005.
- Twilio account: trial limits apply on VPS (error 21608 = unverified number).
- Do not enable real OTP without verifying SMS delivery end-to-end.

## Payments

- Payments are stubs. Do not add real gateway code without explicit instruction.
- Do not log payment amounts, card details, or transaction IDs unless explicitly required.

## File uploads

- Use `multer` for multipart; upload to GCS via `backend/src/storage/src/`.
- Validate file type and size before accepting.
- Never serve raw uploaded files without auth checks.

## General

- No secrets in git, logs, or memory files.
- Sanitize all untrusted input (user IDs, vehicle IDs, etc.) before DB queries.
- Rate limiting is configured via `express-rate-limit` — do not bypass it.
- For major security changes: also load `.cursor/skills/security-and-hardening/SKILL.md`.
