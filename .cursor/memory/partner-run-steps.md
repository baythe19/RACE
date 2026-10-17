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

4. **`peach open` का URL कभी सीधे user tab में नहीं देना** — वह `fetchProxyOrigin=https://127.0.0.1:33059` जोड़ता है, Codespace Cursor Browser उस loopback तक नहीं पहुँचता → वही sootsim redbox. इसलिए URL को **हाथ से बनाया (proxy-free):**
   ```
   http://302e312e31343733.runtime.localhost:7668/rn?orientation=portrait&landscapeSide=left&bundle=http%3A%2F%2Flocalhost%3A8082%2Findex.ts.bundle%3Fplatform%3Dios%26dev%3Dtrue%26hot%3Dfalse%26lazy%3Dfalse%26transform.engine%3Dhermes%26transform.routerRoot%3Dapp%26unstable_transformProfile%3Dhermes-stable&packageVersions=%7B%22%40react-navigation%2Fnative%22%3A%227.3.1%22%2C%22expo%22%3A%2257.0.26%22%2C%22expo-constants%22%3A%2257.0.20%22%2C%22expo-linear-gradient%22%3A%2257.0.2%22%2C%22expo-secure-store%22%3A%2257.0.4%22%2C%22react-native-screens%22%3A%224.26.2%22%7D&expoSwift=http%3A%2F%2Flocalhost%3A7668%2F__peach%2Fexpo-swift%3Froot%3D%252Fworkspaces%252FRACE%252Fmobile%2520application&expoKotlin=http%3A%2F%2Flocalhost%3A7668%2F__peach%2Fexpo-kotlin%3Froot%3D%252Fworkspaces%252FRACE%252Fmobile%2520application
   ```
   Rules: **कोई `fetchProxyOrigin` नहीं**, bundle host **`localhost:8082`** (not `127.0.0.1`), `packageVersions`/`expoSwift`/`expoKotlin` वैसे ही रखने हैं जैसे `peach open` देता है (ऊपर वाले exact values use कर सकते हैं)।
   फ़ाइल में भी सेव रहता है: `/tmp/peach-user-url.txt`.

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
इसलिए `peach open` वाले URL हमेशा redbox देते थे। **Proxy-free URL + `localhost:8082` bundle** = fix.
