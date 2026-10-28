# Customer App — Peach Simulator Runbook (one-time reference)

> **Purpose:** customer app ko Peach browser-sim (peachsim.com) me chalane ka **proven, final** tarika.
> Ye steps dobara derive karne ki zarurat nahi — copy-paste hi kaafi hai.
> Background detail: `docs/DEVICE_FREE_PREVIEW.md` (Peach overview) + `.cursor/memory/partner-run-steps.md` (partner app variant).
> Proven: 2026-10-28 — customer app live in Cursor Browser tab, onboarding rendered, 0 errors.

---

## 0. One-time setup — ALREADY DONE, do NOT repeat

| Setup | Status |
|---|---|
| Peach CLI install (`curl -fsSL https://peachsim.com/install.sh \| sh` + `peach setup --ci --yes`) | ✅ installed, `~/.local/bin/peach` |
| Customer app `node_modules` (root `npm install` kaam nahi karta — folder me jao) | ✅ present |
| Web browser support (`react-native-web`, `react-dom`, metro web shims in `metro.config.js`) | ✅ wired (commit 7b4b389) |
| Peach `doctor` compatibility | ✅ 16 supported / 1 partial / 1 inert |

---

## 1. Daily run — sirf 3 checks + 1 URL

### Step 1 — Infrastructure health (skip jo already 200 de)

```bash
# Backend (zaroori — bookings/OTP iske bina nahi chalenge)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/health        # chahiye: 200
# Agar down: mongo/redis containers up karo, phir backend start (see §5)

# Customer Metro
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8081/status        # chahiye: 200
# Agar down:
cd "/workspaces/RACE/customer application" && nohup npx expo start --port 8081 > /tmp/metro-8081.log 2>&1 & disown
```

### Step 2 — Bundle pre-warm (pehli paint fast karne ke liye; Metro already warm ho to skip)

```bash
curl -s -o /tmp/customer-bundle-warm.bin -w '%{http_code} %{size_download}b in %{time_total}s\n' \
  'http://localhost:8081/index.ts.bundle?platform=ios&dev=true&hot=false&lazy=false&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable'
# Expected: 200 ~15MB — 0.4s (cached) ya ~35s (cold)
```

### Step 3 — Fresh sim bana ke runtime prefix lo

```bash
export PATH="$HOME/.local/bin:$PATH"
cd "/workspaces/RACE/customer application"
timeout 60 peach open 8081 --no-describe
```

Output me se **runtime prefix** copy karo — ye line:
`→ daemon bridge :7668 (shell http://<PREFIX>.runtime.localhost:7668/ …)`
jaise `302e312e31373934` (har Peach daemon session me badalta hai).

### Step 4 — Browser tab ko proven URL pe navigate karo

Template — sirf `<PREFIX>` badlo, **baaki exactly as-is**:

```
http://<PREFIX>.runtime.localhost:7668/rn?orientation=portrait&landscapeSide=left&bundle=http%3A%2F%2Flocalhost%3A8081%2Findex.ts.bundle%3Fplatform%3Dios%26dev%3Dtrue%26hot%3Dfalse%26lazy%3Dfalse%26transform.engine%3Dhermes%26transform.routerRoot%3Dapp%26unstable_transformProfile%3Dhermes-stable&expoSwift=http%3A%2F%2Flocalhost%3A7668%2F__peach%2Fexpo-swift%3Froot%3D%252Fworkspaces%252FRACE%252Fcustomer%2520application&expoKotlin=http%3A%2F%2Flocalhost%3A7668%2F__peach%2Fexpo-kotlin%3Froot%3D%252Fworkspaces%252FRACE%252Fcustomer%2520application
```

Cursor me: Agent se bolo `browser_navigate` kare, ya user khud browser me paste kare.
First paint warm bundle ke saath ~5–15s; app Onboarding screen pe khulti hai ("24/7 Roadside Assistance").

---

## 2. Verify (bina iske "run ho gaya" MAT bolna)

```bash
export PATH="$HOME/.local/bin:$PATH"
peach list --all          # naya sim dikhe: [primary, open, visible] + loaded: bundle localhost:8081/...
peach describe --sim <SIM_ID>     # Onboarding/login screen ka readable text aana chahiye
peach get errors 3 --sim <SIM_ID> # "no errors captured" hona chahiye
peach claim <SIM_ID> --force      # lamba session: 600s lease (idle close se bachata hai)
peach screenshot /tmp/customer-peach-live.png --sim <SIM_ID>   # proof
```

Peach sim ka local URL kisi ko dena ho to: `http://localhost:7668/` (shell page) — per-user browser tab alag sim hota hai, CLI sims se mix mat karo.

---

## 3. REPEAT MAT KARO — ye cheezein try ki ja chuki hain

| ❌ Repeat na karo | Kyun (already-proven outcome) |
|---|---|
| `peach open` ke diye URL me `fetchProxyOrigin=https://127.0.0.1:…` rakhna | Cursor Browser loopback proxy tak nahi pahunchta → redbox "could not reach fetch proxy". Hamesha proxy-free URL (§Step 4) |
| Bundle host `127.0.0.1:8081` | Sim me "Connect" screen pe atakta hai. Sirf `localhost:8081` use karo |
| URL me `packageVersions=…` param | Purana block redbox deta hai (*bundle and project disagree on expo version*). Skip karo |
| Short URL `localhost:7668/rn/8081` ya in-sim Connect me port typing | "Connect \| Peach" screen — engine route Metro tak nahi pahunchta |
| Har run pe `peach setup` / install dobara | One-time hai; sirf `peach --version` se health check kafi |
| Cold bundle ka intezaar UI pe | Step-2 pre-warm kar do — warna 35s blank |
| CLI `peach open` (playwright headless) sims ko user ka main sim maanna | Wo auto-close hote hain (socket 1001); **user ka Browser tab hi primary sim hai** (`peach list` me `[primary, open, visible]`) |
| Sim band hone pe naya URL banana | Pehle `peach claim <SIM_ID> --force` karo — same tab wapas jeevit ho jata hai |
| QA accounts dobara seed karna | `TEST_OTP_WHITELIST` wale numbers DB me permanent hain (see §4); `seed:*` scripts destructive hain — mana hai |
| Map tiles blank pe time waste | Known Peach limitation (`react-native-maps` 90%): markers/route aate hain, tiles blank rehte hain |

---

## 4. Test credentials (customer app)

- **API base (local sim):** `customer application/.env` → `EXPO_PUBLIC_API_URL=https://race-api-w361.onrender.com` (prod Render, live)
- **Login:** koi bhi number; QA/whitelist numbers ko dev OTP `123456` milta hai
  - Customer whitelist: `9876543210`, `9000000005` (+ QA range `9000000001–04`)
  - Local backend chal raha ho to bhi same — whitelist `backend/.env` se aati hai
- **Full account matrix:** `.cursor/memory/activeContext.md` → "QA test accounts READY" entry

---

## 5. Infrastructure restart (jab kuch bhi 200 na de)

```bash
# Mongo + Redis (Codespace restart ke baad eksited hote hain)
docker start race-mongo race-redis 2>/dev/null || docker compose -f /workspaces/RACE/backend/docker-compose.yml up -d

# Backend (background, log file me)
cd /workspaces/RACE/backend && nohup npx tsx src/index.ts > /tmp/backend-3000.log 2>&1 & disown
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/health   # 200 chahiye
```

> Backend port 3000 public visibility (phone testing): `gh codespace ports visibility 3000:public` — sirf jab phone se chahiye.

---

## 6. Driving the app as agent (optional QA)

```bash
export PATH="$HOME/.local/bin:$PATH"
peach tap --sim <SIM_ID> <x> <y>            # coordinates `peach describe` output se lo
peach do tap-text "<button>" --sim <SIM_ID> # text se tap
peach logs --sim <SIM_ID>                   # live console
peach network --sim <SIM_ID>                # API traffic
peach what-happened --sim <SIM_ID>          # screens/toasts/errors summary
peach record /tmp/flow.mp4 --sim <SIM_ID>   # clip (demo ke liye)
```

App may bhi browser tools se directly chalao (user tab me tap/type) — screenshot + `peach describe` dono se verify.

---

## 7. Quick troubleshooting

| Symptom | Fix |
|---|---|
| Redbox "could not reach fetch proxy 127.0.0.1:…" | URL pattern galat — §Step-4 wala exact template use karo |
| "Connect \| Peach" screen | `bundle=` param missing ya host `127.0.0.1` hai |
| Blank/black screen | Metro `:8081` down → Step-1; ya bundle cold (pre-warm step-2) |
| Sim achanak gayab (connection lost) | `peach claim <SIM_ID> --force`, phir browser reload same URL |
| API errors inside app | `peach network` se dekho; backend `:3000` ya Render up hai check karo |
| OTP na aaye | QA number use karo (123456); real numbers pe HanuSMS lagta hai (cost) |
