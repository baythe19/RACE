# Partner app — Codespace Browser run (2026-10-17, PROVEN)

> यह exact sequence आज user browser में काम किया (redbox 33059 गया, RACE PARTNER dashboard दिखा)।
> अगली बार user बोले "partner app run karo" → यही 6 steps बोलो/करो। URL सिर्फ़ metro गिरने पर नया बनाना है।

## Steps (line-by-line, जो किया गया)

1. **Metro band tha → start kiya (detached hi, वरना terminal बंद होते ही मर जाता):**
   ```bash
   cd "/workspaces/RACE/mobile application"
   nohup npx expo start --port 8082 > /tmp/metro-8082.log 2>&1 & disown
   ```
   Check: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8082/status` → **200** चाहिए (log: `/tmp/metro-8082.log`).

2. **Peach bridge + Xvfb healthy confirm kiya** (peach CLI के Playwright sims के लिए Xvfb ज़रूरी है, वरना "Missing X server" crash):
   ```bash
   pgrep -x Xvfb || (Xvfb :99 -screen 0 1280x900x24 >/tmp/xvfb.log 2>&1 & sleep 2)
   export PATH="$HOME/.local/bin:$PATH"; export DISPLAY=:99
   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:7668/   # bridge → 200
   peach list --all
   ```

3. **पुराने/टूटे sims बंद किए** (जिनमें redbox था — af redbox tha):
   ```bash
   peach close <sim-id>       # जैसे af
   peach claim <sim-id> --force   # जो healthy ho, उसे 600s lease
   ```
   ध्यान: CLI Playwright sim अलग चीज़ है, **user का Browser tab अलग** — CLI का Welcome दिखना user tab ठीक होने की गारंटी नहीं।

4. **`peach open` का URL कभी सीधे user tab में नहीं देना** — वह `fetchProxyOrigin=https://127.0.0.1:33059` जोड़ता है, Codespace Cursor Browser उस loopback तक नहीं पहुँचता → वही sootsim redbox. इसलिए URL को **हाथ से बनाया (proxy-free)** — **2026-10-26 Cursor @Browser PROVEN:**
   ```
   http://302e312e31373639.runtime.localhost:7668/rn?bundle=http%3A%2F%2Flocalhost%3A8082%2Findex.ts.bundle%3Fplatform%3Dios%26dev%3Dtrue%26hot%3Dfalse%26lazy%3Dfalse%26transform.engine%3Dhermes%26transform.routerRoot%3Dapp%26unstable_transformProfile%3Dhermes-stable&expoSwift=http%3A%2F%2Flocalhost%3A7668%2F__peach%2Fexpo-swift%3Froot%3D%252Fworkspaces%252FRACE%252Fmobile%2520application&expoKotlin=http%3A%2F%2Flocalhost%3A7668%2F__peach%2Fexpo-kotlin%3Froot%3D%252Fworkspaces%252FRACE%252Fmobile%2520application&orientation=portrait&landscapeSide=left
   ```
   Rules: **कोई `fetchProxyOrigin` नहीं**, bundle host **`localhost:8082`** (not `127.0.0.1`), **`expoSwift` + `expoKotlin` रखो**, **`packageVersions` URL में मत डालो** — पुराना block (expo `57.0.26` vs app `~57.0.30`) redbox देता है: *bundle and project disagree on the installed expo version*.
   Runtime host prefix (`302e312e31373639…`) हर Peach session में बदल सकता है; bridge `7668` पर `peach list` / fresh `peach open` से नया prefix लो।
   Canonical copy: `/tmp/peach-user-url.txt`. Screenshot proof: `/tmp/race-partner-browser-ok.png`.

5. **Cursor Browser को उस URL पर navigate किया (user को दिखे):**
   `browser_navigate` tool → ऊपर वाला URL, `position: "active"`.
   पहली बार ~30–60 s लगते हैं (Metro bundle बनता है)। Redbox दिखे तो `Retry` एक बार, फिर भी न हो तो step 1–4 दोहराओ।

6. **Verify (बिना इसे "done" नहीं कहना):**
   ```bash
   peach list               # नया sim "loaded: bundle localhost:8082/…"
   peach describe --sim <id>   # RACE PARTNER / Bikram / "2 new leads" दिखे
   peach get errors 3 --sim <id>   # "no errors captured"
   peach claim <id> --force   # sim बंद न हो जाए (600s lease)
   ```
   + Cursor Browser screenshot में UI दिखे (या peach सिम में) — सिर्फ़ "Opening app" न हो।

## Navigation (jo बाद में किया)

- Sim UI चलाने के लिए CLI: `peach describe --sim <id>`, `peach tap --sim <id> <x> <y>`, `peach screenshot --sim <id> out.png`.
- User Browser **tab खुला रहे तब तक sim जिंदा** रहता है (Claim = 600s, एक और `peach claim --force` दे देना हर ~9 मिनट पर अगर लंबा session हो)।

## Root cause (एक line में)

Codespace पर Cursor Browser `127.0.0.1:33059` (peach का per-run fetch proxy) तक नहीं पहुँचता —
इसलिए `peach open` वाले URL हमेशा redbox देते थे। **Proxy-free URL + `localhost:8082` bundle, बिना stale `packageVersions`** = fix.

**Cursor Browser vs CLI:** Browser tab = अलग sim (e.g. `8f223f7b-…`); CLI `--chromium` sim = अलग (e.g. `9529a1b3-…`). दोनों OK; एक दूसरे की गारंटी नहीं।

## CLI agent / headless Peach (2026-10-26, PROVEN)

जब **Xvfb install नहीं** (no sudo), `--driver playwright --headless` बिना Chromium के Playwright host बंद कर देता है (socket 1001).

```bash
export PATH="$HOME/.local/bin:$PATH"
cd "/workspaces/RACE/mobile application"
peach open 8082 --new --driver playwright --headless --chromium --ephemeral \
  --project-root "/workspaces/RACE/mobile application" --no-describe
peach use <sim-id>
peach claim <sim-id> --force
peach wait ready --max-ms 600000
peach describe
```

Test login: `peach do type-into partnerLoginMobile 8888880001` → `peach do tap-text "Send OTP"`.
