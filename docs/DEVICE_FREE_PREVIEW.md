# Preview RACE mobile apps without a phone (Peach browser simulator)

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
- **⚠ The ONLY proven way to show the app to the user (2026-10-16 pm, user-verified):**
  1. Metro detached: `nohup npx expo start --port 8082 > /tmp/metro-8082.log 2>&1 & disown` (plain background shells get killed → "No dev servers found").
  2. Sim+URL detached: `nohup peach open 8082 --no-describe > /tmp/peach-open.log 2>&1 & disown`; URL = `grep -oE '"url": "[^"]+"' /tmp/peach-open.log | cut -d'"' -f4` (a `302e…runtime.localhost:7668` URL with `fetchProxyOrigin` + `bundle=`; **changes every run**, proxy-bound).
  3. `browser_navigate` (Cursor browser, `position: "active"`) to that URL → app renders ~60 s. Verify `peach describe --sim <newest>` shows "RACE PARTNER"/"Bikram"; `peach get errors 3` empty.
- **Dead ends (do not retry):** short URL `localhost:7668/rn/8082` → dev-client "Connect" screen, dead end; dev-client URL field (any value) → never connects; in-sim icons (Native UI/Docs/Browser) are Peach demos, not our app; `peach dev` missing in CLI 0.1.1594; `peach preview` needs login.
- Redbox "could not reach fetch proxy at https://127.0.0.1:33059" = that run's proxy died (open wasn't detached or Metro went down). Fix: re-run steps 1-2 (old URL is proxy-bound and unrevivable).
- (2026-10-16 pm) Sims opened via CLI (`peach open 8082` fresh) auto-closed after ~30 s; the long-lived tab survived. Fix that worked: `peach use a1` (the healthy sim) then `peach open 8082 --no-describe` — loads the partner bundle into the same sim; verify with `peach list` (`title: [a1] 8082 | Peach`) + `peach describe`.
- (2026-10-16 pm) For agent-driven runs the real fix for auto-close is `peach claim <sim>` — grants a 600 s exclusive lease and stops the socket-close churn. Full partner flow verified under it: welcome → driver type → vendor login → demo login → dashboard → jobs → accept trip (live trip screen + bottom sheet). `react-native-maps` renders markers/route but map tiles stay blank (known 90% support).
- A browser tab stuck on Peach's "Connect" / dev-client screen with a keyboard (title "Connect | Peach") is the raw `/rn` URL without a `bundle=` param — the Expo dev-client route, which cannot reach Metro from this box. Always use the shell `http://localhost:7668/` or `peach open <port>` instead.
