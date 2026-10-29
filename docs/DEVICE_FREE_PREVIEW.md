# Preview RACE mobile apps without a phone (Peach browser simulator)

> **Ready-to-use runbook (proven 2026-10-28):** customer app ke liye final copy-paste steps + "repeat-mat-karo" list → **`docs/CUSTOMER_APP_PEACH_RUNBOOK.md`** — wahi use karo, ye file background/gotchas ke liye.
>
> Use this whenever no physical device / emulator is available (e.g. Codespace, remote box).
> Installed and **proven on 2026-10-16**: customer app onboarding rendered pixel-perfect, taps worked, API fetches live.

**Peach** (https://peachsim.com) runs our **real Metro/Expo bundle** inside a browser-based
iOS/Android simulator (WebGPU/WASM engine). No Xcode, no Android SDK, no APK build needed.
Free for individuals (commercial use included). Verified against our stack:
`react-native-maps` 90% · `expo-secure-store` 95% · `reanimated` 99% · `screens` 99% —
full `peach doctor` report: 16 supported / 1 partial / 1 inert.

## One-time setup — already done on this machine

- CLI at `~/.local/bin/peach` (v0.1.1594), runtime at `~/.peach/`
- If a new machine ever needs it:

```bash
curl -fsSL https://peachsim.com/install.sh | sh   # no sudo, no node needed
peach setup --ci --yes
```

## Daily run (2 commands + 1 URL)

Terminal 1 — start the app (Metro):

```bash
cd "customer application" && npx expo start --port 8081
# partner app: cd "mobile application" && npx expo start --port 8082
```

Terminal 2 — open the simulator against it:

```bash
peach open 8081          # partner app: peach open 8082
peach wait ready         # wait until it prints "ready in ..."
```

View it:

- Cursor: `Ctrl+Shift+P` → **"Simple Browser: Show"** → `http://localhost:7668/`
- or any browser on the same machine

Edit code → the simulator **hot-reloads** automatically (Metro drives it; Peach never rebuilds).

## Agent / QA commands (run from the app folder)

| Command | What it does |
|---|---|
| `peach describe` | current screen as readable UI text (agent-friendly) |
| `peach tap <x> <y>` / `peach screenshot out.png` | drive the app + capture PNG |
| `peach device list` / `peach device <model>` | switch iPhone/Pixel presets — verify our `px()` REF_W=390 scaling on other sizes |
| `peach permissions` | grant/deny camera, location etc. (test permission fallbacks) |
| `peach location set <lat> <lng>` | fake GPS — perfect for LocationPickerMap / ride tracking |
| `peach record out.mp4` / `peach film` | record webm/mp4/gif clips (client demos) |
| `peach logs` / `peach network` | live console output / API traffic from the running app |
| `peach what-happened` | semantic events: screens, toasts, alerts, fetches, errors |
| `peach maestro test flow.yaml` | automated E2E flows in Maestro YAML (login → book → track) |
| `peach find "text"` / `peach assert` | locate elements & make assertions (scriptable QA) |
| `peach perf` | CPU / render / scroll-frame profiling |
| `peach storage reset` / `peach cleanup` | reset app state / reclaim disk |

## Gotchas (learned on 2026-10-16)

- Redbox `libatk-1.0.so.0 … react-native-devtools` in the Metro terminal is **harmless** — it is the optional terminal DevTools, not the app.
- `expo-status-bar` renders inert inside Peach (cosmetic only).
- `expo-location` 80% (no compass heading) — fine for our screens.
- First bundle load ≈ 35 s; reloads are fast.
- Partner app (`mobile application/`) not doctor-checked yet — run `peach doctor` there once before heavy use.
- Bridge serves on `http://localhost:7668/`; Metro ports: customer 8081, partner 8082.
- **⚠ Codespace / Cursor Browser — ONLY proven way (2026-10-17, fixed sootsim 33059 loop):**
  **Line-by-line proven steps (Hindi, copy-paste ready): `.cursor/memory/partner-run-steps.md` — read that first.** Summary:
  1. Metro detached: `cd "mobile application" && nohup npx expo start --port 8082 > /tmp/metro-8082.log 2>&1 & disown`. Check: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8082/status` → 200. Peach bridge must be up (`peach` / port 7668).
  2. **Do NOT navigate to a `peach open` URL that includes `fetchProxyOrigin=https://127.0.0.1:33059`.** On Codespace the Cursor Browser cannot reach that loopback proxy → redbox `dev server unreachable (could not reach fetch proxy at https://127.0.0.1:33059…)`. Same error repeats until the URL is rewritten.
  3. Navigate Cursor Browser (`browser_navigate`, `position: "active"`) to a **proxy-free** engine URL:
     `http://302e312e31343733.runtime.localhost:7668/rn?orientation=portrait&landscapeSide=left&bundle=http%3A%2F%2Flocalhost%3A8082%2Findex.ts.bundle%3Fplatform%3Dios%26dev%3Dtrue%26hot%3Dfalse%26lazy%3Dfalse%26transform.engine%3Dhermes%26transform.routerRoot%3Dapp%26unstable_transformProfile%3Dhermes-stable&packageVersions=…&expoSwift=http%3A%2F%2Flocalhost%3A7668%2F__peach%2Fexpo-swift%3Froot%3D…&expoKotlin=…`
     Rules: **no `fetchProxyOrigin`**, bundle host **`localhost:8082`** (not `127.0.0.1`). First paint ~30–60 s while Metro bundles.
  4. Verify: `peach list` shows a new sim with `loaded: bundle localhost:8082/…`; `peach describe --sim <id>` shows RACE PARTNER / Welcome / dashboard; `peach get errors 3` empty; Browser screenshot shows the UI (not redbox / "Opening app").
  5. Optional agent-only: `DISPLAY=:99` + Xvfb, then `peach open 8082` / `peach claim <sim>` for CLI taps. Playwright sims ≠ the user's Browser tab — always confirm the **Browser** screenshot.
- **Dead ends (do not retry):** any URL with `fetchProxyOrigin=…127.0.0.1:33059` in Cursor Browser on Codespace; short URL `localhost:7668/rn/8082` → Connect screen; typing 8082 into in-sim Connect; `peach open` without Xvfb (`Missing X server`) when using `--driver playwright`; assuming a healthy CLI sim (`peach describe` Welcome) means the user tab is fine — user may be on a different redbox sim.
- Redbox "could not reach fetch proxy at https://127.0.0.1:33059" on Codespace = **wrong URL shape**, not "retry the same open". Strip `fetchProxyOrigin` and use `bundle=http://localhost:8082/…` (step 3).
- (2026-10-16 pm) Sims opened via CLI (`peach open 8082` fresh) auto-closed after ~30 s; the long-lived tab survived. Fix that worked: `peach use a1` (the healthy sim) then `peach open 8082 --no-describe` — loads the partner bundle into the same sim; verify with `peach list` (`title: [a1] 8082 | Peach`) + `peach describe`.
- (2026-10-16 pm) For agent-driven runs the real fix for auto-close is `peach claim <sim>` — grants a 600 s exclusive lease and stops the socket-close churn. Full partner flow verified under it: welcome → driver type → vendor login → demo login → dashboard → jobs → accept trip (live trip screen + bottom sheet). `react-native-maps` renders markers/route but map tiles stay blank (known 90% support).
- A browser tab stuck on Peach's "Connect" / dev-client screen with a keyboard (title "Connect | Peach") is the raw `/rn` URL without a `bundle=` param — the Expo dev-client route, which cannot reach Metro from this box. Always use the shell `http://localhost:7668/` or `peach open <port>` instead.
