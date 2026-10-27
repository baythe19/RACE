# RACE — Cloud production runbook (Render, Vercel, Expo EAS)

> **Purpose:** Single source of truth for agents and humans after the Oct 2026 cloud setup.  
> **No secrets in this file** — only names, URLs, IDs, and where to configure values (Render/Vercel/Expo dashboards).

**Last updated:** 2026-10-07  
**Work branch:** `v2.5.2-development` (push deploy-related changes here unless the user names another branch cut from it).

---

## 1. What is live today

| Surface | Host | Public URL | Repo path |
|--------|------|------------|-----------|
| **Backend API** | Render (Singapore) | `https://race-api-w361.onrender.com` | `backend/` |
| **Health** | same | `GET /health` → 200 when warm | — |
| **Admin web** | Vercel | `https://race-admin-six.vercel.app` (aliases may exist under `*.vercel.app`) | `race-admin/` |
| **Customer Android APK** | Expo EAS (`@webstarts/race-service`) | Download from [Expo builds](https://expo.dev/accounts/webstarts/projects/race-service/builds) | `customer application/` |
| **Customer dev (Expo Go)** | Local Metro + tunnel | `EXPO_PUBLIC_API_URL` → Render URL in `.env` | `customer application/` |

**Not in scope of this cloud cut (yet):**

- Partner mobile APK / Play Store
- iOS App Store / TestFlight
- Legacy GCP VM (`race-server`, branch `release/13July26`) — still old snapshot; **do not assume** it matches this workspace
- Real payment gateway (stubs only)

---

## 2. Infrastructure IDs (for MCP / dashboards)

### Render

| Item | Value |
|------|--------|
| Web service name | `race-api` |
| Service ID | `srv-db2ubpgm7kps73cc4290` |
| Region | Singapore |
| Build | `cd backend && npm install --include=dev && npm run build` |
| Start | `cd backend && npm start` |
| Redis | `race-redis` (Singapore, free tier) |

**MCP:** `plugin-render-render` — `list_logs`, `get_service`, `update_environment_variables`, `trigger_deploy`, etc. Select workspace if prompted.

### Vercel

| Item | Value |
|------|--------|
| Project name | `race-admin` |
| Project ID | `prj_03kFxfUWTBTUvk4SjrHvJvpFiy2y` |
| Root directory | `race-admin` |
| Build command | `npm run build` |
| Output | `apps/admin-web/dist` |
| SPA | Fallback route so `/login` works |

**Required env (Vercel):**

- `VITE_API_URL` = `https://race-api-w361.onrender.com/api/v1` (include `/api/v1`)

**MCP:** `plugin-vercel-vercel` — deployments, env, logs. Auth via MCP if namespace shows `needsAuth`.

### Expo / EAS (customer app)

| Item | Value |
|------|--------|
| Account | `webstarts` (`teamwebstarts@gmail.com`) |
| Project full name | `@webstarts/race-service` |
| **EAS project ID** (use this) | `277981d5-5046-4288-8c91-672aab158419` |
| Android package | `com.racecar.customer` |
| iOS bundle (future) | `com.racecar.customer` |
| APK profile | `production` in `customer application/eas.json` (`buildType: apk`) |

**Deprecated — do not link builds here:**

- Old ID `d2ee249a-2460-48ef-8fab-0ac41d53eb49` (`@race-service/race`) — owner/slug mismatch with current login.

**Critical config alignment** (`customer application/app.config.js`):

- `owner` must match Expo project owner → **`webstarts`**
- `slug` must match Expo project slug → **`race-service`**
- `extra.eas.projectId` → **`277981d5-5046-4288-8c91-672aab158419`**

If `eas project:info` errors about owner/slug mismatch, fix those fields before building.

**MCP:** `user-expo` — `build_run`, `build_list`, `build_info`, `build_logs`. Requires GitHub linked to the EAS project for `build_run` from git; otherwise use CLI upload build (below).

### GitHub

| Item | Value |
|------|--------|
| Repo | `teamwebstarts-cmyk/RACE` |
| EAS monorepo subdirectory | `customer application` |

**MCP:** `plugin-github-github` — PRs, files, actions. Use `gh` CLI if MCP unavailable.

### MongoDB Atlas

- DB name: `race` (connection string in Render `MONGODB_URI` only — never commit).
- Network: allow Render + dev IPs as needed.

**MCP:** `plugin-mongodb-mongodb` — query/debug when connected.

---

## 3. Environment variables (names only)

### Render (`race-api`)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Atlas → database `race` |
| `NODE_ENV` | Often `development` on Render; OTP rate limits differ from strict production |
| `FORCE_MOCK_OTP` | **`false`** for real MessageCentral SMS |
| `MOCK_DATA_MODE` | `true` for seeded mock users / universal OTP paths in dev |
| `MOCK_UNIVERSAL_OTP` | e.g. `123456` for seeded test numbers when mock mode applies |
| `MC_CUSTOMER_ID`, `MC_AUTH_TOKEN`, `MC_BASE_URL` | MessageCentral VerifyNow |
| Redis URL | From Render Redis attachment |

**OTP:** SMS is 6 digits (`otpLength=6` in `backend/src/utils/src/sms.ts`). User-facing errors are sanitized in `otp.ts` + customer `humanizeApiError.ts`.

### Vercel (`race-admin`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | `https://race-api-w361.onrender.com/api/v1` |

### Admin login (not Mongo)

- Credentials live in `backend/src/config/hardcoded-admin.ts` (env-backed). The `Admin` Mongo model is **not** used for login.

### Customer app (build-time)

| Variable | Where |
|----------|--------|
| `EXPO_PUBLIC_API_URL` | `customer application/eas.json` → `production.env` = `https://race-api-w361.onrender.com` (no `/api/v1` suffix — app adds `/api/v1/...` in `src/config/api.ts`) |
| `EXPO_PUBLIC_SKIP_OTP_AUTH` | Local `.env` only; production APK should be **`false`** or unset |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Optional on EAS **Secrets** for maps in release builds |

---

## 4. Pre-flight checklist (agents — run before every cloud change)

1. **Branch:** `git branch --show-current` → `v2.5.2-development` (or user-named branch). Do not commit to frozen `main` / old release branches.
2. **Memory:** Read `.cursor/memory/activeContext.md`, `agents-lock.md`, and this runbook.
3. **Claim surface** in `agents-lock.md` (`customer` | `admin` | `backend` | `docs`).
4. **Backend:** `cd backend && npm run lint`. Hit `GET https://race-api-w361.onrender.com/health`.
5. **Admin:** `cd race-admin && npm run build` if admin changed.
6. **Customer:**  
   - `cd "customer application" && npm run lint`  
   - `npx expo-doctor` → expect **21/21**  
   - Confirm `react-native-worklets` is installed (Reanimated peer — release APK crashes without it).
7. **EAS:** `cd "customer application" && eas whoami` — must be logged in as **`webstarts`** (or set `EXPO_TOKEN` for CI).
8. **EAS project:** `eas project:info` — no owner/slug/projectId mismatch.
9. After edits: update this runbook or `learnings.md` if a new trap appears; clear `agents-lock.md`.

---

## 5. Common operations

### Deploy backend (Render)

1. Push to `v2.5.2-development`.
2. Render auto-deploy or `trigger_deploy` via Render MCP.
3. Verify logs for MessageCentral `send-OTP` / `validate` and `POST /api/v1/auth/*` status codes.

### Deploy admin (Vercel)

1. Push `race-admin/` changes.
2. Confirm `VITE_API_URL` on Vercel project.
3. Open `/login` — not only `/`.

### Build customer Android APK (recommended path)

```bash
cd "customer application"
eas login                    # once per machine — account webstarts
eas project:info             # must succeed
npx expo-doctor              # 21/21
npm run lint
eas build -p android --profile production
```

- Artifact: **APK** (not AAB) from build page.
- API is baked from `eas.json` `production.env.EXPO_PUBLIC_API_URL`.
- First successful **CLI** build also unlocks **Build from GitHub** on Expo (see Expo docs).

### Build from GitHub (Expo UI or MCP `build_run`)

1. Expo project → **GitHub** → link `teamwebstarts-cmyk/RACE`.
2. **Base directory:** `customer application`.
3. Branch: `v2.5.2-development`, profile `production`, platform Android.

**MCP `build_run` failure “No repository found”** → GitHub not linked to project `277981d5-…`.

**MCP “Entity not authorized”** → Cursor Expo MCP user is not in the `webstarts` org; use CLI with `eas login` or add member / `EXPO_TOKEN`.

### Local customer app against Render (Expo Go)

```bash
cd "customer application"
# .env:
# EXPO_PUBLIC_API_URL=https://race-api-w361.onrender.com
# EXPO_PUBLIC_SKIP_OTP_AUTH=false
npm start
# or: npx expo start --tunnel
```

---

## 6. What we fixed in the Oct 2026 session (don’t regress)

| Area | Done |
|------|------|
| Render | API live; `FORCE_MOCK_OTP=false`; real MC SMS; Redis + Atlas |
| OTP | 6-digit MC; friendly errors; `OtpInput` paste/backspace UX |
| Vercel | Admin deployed with `VITE_API_URL` + SPA fallback |
| EAS | New project `@webstarts/race-service`; owner/slug/projectId aligned |
| SDK | Expo 57; `expo-doctor` clean; `react-native-worklets` added |
| APK config | `EXPO_PUBLIC_API_URL` in `eas.json` production → Render |

| Area | Not done / follow-up |
|------|----------------------|
| Partner APK | `mobile application/` — separate EAS project if needed |
| iOS | No production build yet |
| Play Store submit | `google-services.json` path in eas.json — file gitignored |
| EAS GitHub automation | Optional; link repo for MCP `build_run` |
| VPS | Still old branch; cloud path is Render+Vercel+EAS |

---

## 7. Agent tooling map

Use this so the next session does not stall on “what can we use?”.

### Skills (load when task matches)

| Skill | Use when |
|-------|----------|
| `.agents/skills/deployment/SKILL.md` | **GCP VPS only** — not Render |
| `.agents/skills/feature-implementation/SKILL.md` | New feature across surfaces |
| `.agents/skills/debugging/SKILL.md` | OTP/API failures |
| `.agents/skills/testing/SKILL.md` | `comprehensive-audit`, seed |
| `.agents/skills/security-review/SKILL.md` | Auth, tokens, PII |
| `/workspaces/RACE/.cursor/skills/verification-before-completion/SKILL.md` | Before saying “done” |
| Expo: `eas-app-stores`, `eas-hosting`, `eas-update` | Store builds, OTA (under `~/.agents/skills/` or Cursor cache) |

### MCP namespaces (discover with `GetDynamicTools`)

| Namespace | Use for |
|-----------|---------|
| `user-expo` | EAS builds, logs, workflows |
| `plugin-render-render` | Render deploy, logs, env |
| `plugin-vercel-vercel` | Vercel deploy, env, runtime logs |
| `plugin-github-github` | Repo, PRs, issues |
| `plugin-mongodb-mongodb` | Atlas data inspection |
| `cursor-ide-browser` | Admin UI smoke tests |
| `cursor` | Task subagents, etc. |

**Auth:** If MCP shows `needsAuth`, call `mcp_auth` for that namespace once, then retry.

### CLI fallbacks

| Tool | When |
|------|------|
| `eas` / `npx eas-cli` | Builds when MCP lacks org access |
| `gh` | GitHub when GitHub MCP missing |
| `curl` | `/health`, quick API checks |

---

## 8. Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| No SMS OTP | `FORCE_MOCK_OTP=true` on Render | Set `false`, redeploy |
| 4-digit SMS vs 6 UI boxes | Old backend | Ensure `otpLength=6` deployed |
| Admin login 404 | Wrong API path | Use `/api/v1/admin/auth/login` |
| Admin blank on refresh | Missing SPA rewrite | Vercel rewrites to `index.html` |
| `eas project:info` owner error | `owner: 'race-service'` with webstarts project | `owner: 'webstarts'` |
| `eas project:info` slug error | `slug: 'race'` | `slug: 'race-service'` |
| APK hits wrong API | Missing EAS env | `eas.json` `production.env.EXPO_PUBLIC_API_URL` |
| Release APK crash on open | Missing worklets | `npx expo install react-native-worklets` |
| Render cold start | Free tier sleep | First request slow; health poll |
| Second OTP SMS delayed | Rapid resend / carrier | Wait ~60s; see OTP service logs |

---

## 9. Related docs

| Doc | Topic |
|-----|--------|
| `docs/ops/LOCAL_CUSTOMER_UI_DEV.md` | **Local customer UI only** — Expo + Render, UI preview mode |
| `docs/MOCK_TESTING_PLAYBOOK.md` | Local mock users, universal OTP |
| `docs/CODESPACE_PHONE_CONNECTION_PLAYBOOK.md` | Expo Go + tunnel (dev) |
| `docs/SYSTEM_AUDIT_AND_TEST_CASES.md` | Full audit script |
| `AGENTS.md` | Repo-wide agent rules |
| `.agents/rules/manual-deployment.md` | **GCP VPS** deploy only |

---

## 10. Session handoff snippet (copy for `activeContext.md`)

```
Cloud: API Render race-api-w361 | Admin Vercel race-admin-six | Customer APK @webstarts/race-service (277981d5-…).
Branch: v2.5.2-development. EAS: eas login as webstarts; eas build -p android --profile production.
Before APK: expo-doctor 21/21, owner webstarts, slug race-service, Render URL in eas.json.
```
