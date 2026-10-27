# 12 — Security Audit

**Method:** direct code inspection of auth/OTP/JWT/admin/upload/socket/CORS paths. No penetration testing, no live server, no DB. Each finding carries `file:line` evidence and a proposed fix (**nothing was changed**).

**Headline:** the *user* auth path is genuinely well built (hashed credentials, role locking, refresh rotation, provider-side OTP, rate limits). The holes are around it: **admin auth**, **uploaded document privacy**, **realtime authorization**, and **default credentials**.

---

## 1. Findings table

| ID | Severity | Finding | Evidence | Impact |
|----|----------|---------|----------|--------|
| **SEC-1** | 🔴 Critical | Admin login is a **hardcoded email/password compared in plain text**, with a working default (`Admin@123`). No hashing, no lockout, no rate limiter on `/api/v1/admin/auth/login` | `hardcoded-admin.ts:24-28`, `adminAuth.ts:30-33`, `adminAuthRoutes.ts:15` (no rate limiter while customer auth has one) | Full platform takeover if env is unset/weak; unlimited brute force |
| **SEC-2** | 🔴 Critical | Socket.IO has **no handshake auth**; `booking:track` lets any client join any booking room and receive live driver location + status; `driver:join` accepts any driverId | `socket.ts:17-36` | Live PII leak (customer location, driver location) to anyone who can reach the API |
| **SEC-3** | 🔴 Critical | Uploaded KYC files are served **publicly and permanently** — local fallback writes into `<cwd>/uploads` and `app.use('/uploads', express.static(...))` exposes it with no auth; GCS objects are stored with a **public** `https://storage.googleapis.com/<bucket>/<path>` URL (not signed) | `app.ts:32`, `storage/src/index.ts:117-125, 68-72` | Aadhaar/PAN/licence/selfie disclosure; no revocation; GDPR/DPDP exposure |
| **SEC-4** | 🟠 High | `CORS_ORIGIN` defaults to `*`, which the code turns into `origin: true` (reflect **any** origin) **with `credentials: true`** — same for Socket.IO CORS | `env.ts:24`, `app.ts:19-24`, `socket.ts:12-16` | Any website can call the API from a victim browser; enlarges SEC-1/SEC-2 blast radius |
| **SEC-5** | 🟠 High | Upload validation is **MIME-string only** (client-controlled); no magic-byte sniffing, no image re-encode, no AV scan, no per-account storage quota | `middleware/src/upload.ts:8-14`, `storage/src/index.ts:113-121` | Malicious file with `.pdf`/`image/png` MIME passes; stored XSS if ever served inline; storage abuse |
| **SEC-6** | 🟠 High | `FORCE_MOCK_OTP=true` (raw `process.env`, not schema-validated) disables the SMS provider **in any environment** and the dev path **returns the OTP in the API response** (`devOtp`) | `otp.ts:28-32`, `otp.ts:137-147` | One env flag ⇒ login as any mobile number |
| **SEC-7** | 🟠 High | Admin and user JWTs are signed with the **same secrets** (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`); the user middleware does **not** reject `tokenType: 'admin'` tokens | `adminJwt.ts:30-34, 71-79` vs `middleware/src/auth.ts:19-24` | Token confusion: an admin token is a valid "user" token (`sub=race-platform-admin`, `role=SUPER_ADMIN`); any endpoint without `requireRole` treats it as a user |
| **SEC-8** | 🟡 Medium | Universal OTP `123456` accepted when `MOCK_DATA_MODE` is truthy — and `z.coerce.boolean()` makes the string `"false"` truthy | `otp.ts:150-158`, `env.ts:37` | Staging/preview exposure; prod guarded by an `NODE_ENV !== 'production'` check ✅ |
| **SEC-9** | 🟡 Medium | `GET /api/v1/qr/:id` and `/:id/metadata` have **no auth middleware at all** and return vehicle/owner metadata by id | `qrRoutes.ts:9-10` | Anyone with an id can enumerate vehicle owner data |
| **SEC-10** | 🟡 Medium | `GET /api/v1/fare/*` are public and unauthenticated (no rate limiter beyond global) — each call proxies Google Distance Matrix (paid key) | `fareRoutes.ts:9-10`, `googleMaps.ts:36-45` | Cost amplification / API-key quota abuse |
| **SEC-11** | 🟡 Medium | Admin refresh tokens are stored in the same cache namespace pattern as users but the platform admin id is a **constant string** ⇒ all admin sessions share one identity; no per-session revocation UI, no forced logout on password change | `adminJwt.ts:36-44`, `hardcoded-admin.ts:5` | Cannot revoke a compromised admin session individually |
| **SEC-12** | 🟡 Medium | Login/OTP responses distinguish "wrong OTP" vs "expired" vs "max attempts" and `send-otp` leaks `isExistingUser` **and role** | `auth.ts:110-140`, `otp.ts:120-160` | Account/role enumeration by mobile number |
| **SEC-13** | 🟡 Medium | Refresh-token reuse detection missing: rotation happens (`revokeRefreshToken` then new pair) but re-use of an **already-rotated** token only fails silently; no family invalidation | `auth.ts:263-283` | Stolen refresh token can be used once without alerting |
| **SEC-14** | 🟢 Low | Admin `resetPassword` is a no-op that throws, `forgotPassword` only logs; `hashPassword` is identity | `adminAuth.ts:93-111` | No recovery path (operational risk, not exposure) |
| **SEC-15** | 🟢 Low | `/uploads` static mount + `express.static` also allows directory-style listing behaviour on some setups; no `Content-Disposition`/`X-Content-Type-Options` per file | `app.ts:32` | Relates to SEC-3 |
| **SEC-16** | 🟢 Low | `xlsx`/CSV export endpoint (`/admin/customers/export/csv`) has no row cap or audit trail in the sampled code | `customersRoutes.ts:10` | Bulk PII export without logging |

## 2. What is genuinely good security-wise [V]

| Control | Evidence |
|---------|----------|
| OTP generated with `crypto.randomInt` (not `Math.random`) | `utils/src/otp.ts:3-5` |
| OTP verification delegated to MessageCentral server-side in production (no digit stored) | `otp.ts:8-16`, `sms.ts:125-180` |
| OTP expiry + resend cap + verify-attempt cap enforced in production | `otp.ts:39-51, 100-104` |
| Driver passwords bcrypt-hashed, never returned (`select: false`) | `utils/src/driverPassword.ts:3-13`, `userProfileSchema.ts:207` |
| One mobile number ⇒ one role, locked after verification | `auth.ts:57-79` |
| Suspended/inactive accounts blocked at login **and** on refresh | `auth.ts:38-45, 271` |
| Refresh rotation stored in cache with TTL (Redis required in production) | `jwt.ts:38-58`, `cache.ts:112-124` |
| Role checks fall back to DB role (JWT role cannot be stale/forged) | `middleware/src/role.ts:11-31` |
| Admin RBAC is permission-based and enforced per route | `requirePermission.ts:7-20`, all `admin/*` routes |
| Generic 500 body, no stack leak; typed error → status mapping | `middleware/src/error.ts:37-46` |
| Rate limiting on OTP (10/h), auth (20/15 min), global (200/15 min in prod) | `rateLimiter.ts:6-25` |
| Env schema requires ≥32-char JWT secrets and refuses to boot otherwise | `env.ts:12-13, 47-50` |
| Admin middleware rejects non-admin tokens (`tokenType` check) | `adminJwt.ts:71-79` |
| Upload size + count + extension allow-list | `upload.ts:5-14` |

## 3. Proposed remediation (not applied)

| Order | Fix | Effort | Risk reduced |
|-------|-----|--------|--------------|
| 1 | Remove the `ADMIN_PASSWORD` default; require a strong value at boot (fail fast) + add `authRateLimiter` to admin login + bcrypt the value | S | SEC-1 |
| 2 | Put docs behind an authenticated route/signed URL; drop the public static mount and the public GCS URL | M | SEC-3 |
| 3 | Authenticate Socket.IO (`io.use` JWT verify), authorize room joins against booking ownership | M | SEC-2 |
| 4 | Set `CORS_ORIGIN` to explicit origins in every environment; fail closed on `*` in production | S | SEC-4 |
| 5 | Separate admin JWT secrets **or** reject `tokenType:'admin'` in the user middleware | S | SEC-7 |
| 6 | Magic-byte validation + AV scan + per-account quotas on upload | M | SEC-5 |
| 7 | Make `FORCE_MOCK_OTP` schema-validated and refuse it when `NODE_ENV=production` | S | SEC-6 |
| 8 | Add auth to `/api/v1/qr/*` or explicitly document it as an emergency-scannable public endpoint | S | SEC-9 |
| 9 | Refresh-token reuse detection (invalidate the family) | M | SEC-13 |
| 10 | Rate-limit + audit bulk exports | S | SEC-16 |

## 4. Security score

| Area | Weight | Score | Commentary |
|------|-------:|------:|------------|
| User authentication & session | 20% | 8/10 | Strong design; minor reuse-detection gap |
| OTP | 15% | 8/10 | Provider-backed, guarded; flag risk (SEC-6) |
| Admin authentication & RBAC | 15% | 2/10 | Hardcoded, plaintext, no rate limit |
| Authorization/IDOR on user data | 15% | 6/10 | Role gates good; QR + sockets + admin tokens weak |
| File upload & PII at rest | 15% | 2/10 | Public URLs, MIME-only validation |
| Transport/infra config | 10% | 5/10 | helmet ✓, CORS wildcard ✗, trust proxy ✓ |
| Secrets management | 5% | 4/10 | Validated schema ✓ but defaults exist and `.env` handling must be confirmed per environment |
| Auditability | 5% | 6/10 | `activityLog` for admin actions ✓; nothing for user-side sensitive reads |
| **Weighted** | 100% | **5.1/10** | |

### Two-level view

| Capability | If DONE | If NOT done | Today |
|-----------|--------:|------------:|-------|
| Admin identity not hardcoded + rate-limited login | 10 | 0 | **1** |
| Document URLs require auth/signature | 10 | 0 | **1** |
| Socket auth + room authorization | 10 | 0 | **2** |
| User auth (role lock, rotation, provider OTP) | 10 | 0 | **8** — done |
| Upload validation beyond MIME | 10 | 2 | **3** |
| CORS locked to known origins | 10 | 3 | **4** |
| Secrets separated per surface (admin vs user) | 10 | 4 | **4** |
