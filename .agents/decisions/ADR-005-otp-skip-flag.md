# ADR-005 — OTP Skip Flag

**Date:** 2026-09-05
**Status:** Active

## Context

Both mobile apps have `SKIP_OTP_AUTH = true` gating real SMS delivery. Twilio is configured and SMS delivery works (except for a Twilio trial error 21608 on the VPS).

## Decision

Leave `SKIP_OTP_AUTH` as-is until the user explicitly asks to enable real OTP in production.

## Rationale

Enabling OTP without verifying SMS delivery end-to-end would lock out all test users. The flag allows development to proceed without SMS credits.

## Consequences

- Real OTP login is NOT active in the current build.
- When enabling: set flag to `false`, verify Twilio account is not on trial limits, test SMS delivery.
- Files: `customer application/src/screens/auth/MobileNumberScreen.tsx`, `mobile application/src/screens/partner/auth/PartnerLoginScreen.tsx`.

## Affected Areas

Customer app auth, partner app auth, `backend/src/services/src/auth.ts` (OTP send/verify).
