# GitHub Codespaces & Physical Phone Connection Playbook

> **Purpose**: This guide documents the exact setup and troubleshooting steps required to seamlessly run and connect RACE mobile apps (**Customer** & **Partner**) from a **GitHub Codespace** to a **Physical Mobile Phone** via Expo Go.

---

## 1. Why Codespace Needs Special Connection Setup
When running locally on the same Wi-Fi network, Expo broadcasts `exp://192.168.x.x:8081` which your phone can reach directly.
In **GitHub Codespaces**:
1. Codespace runs on an isolated cloud VM (`10.0.x.x`), which a physical phone on home Wi-Fi/4G **cannot reach**.
2. GitHub port forwarding provides HTTPS endpoints (`https://...app.github.dev`), which return web JSON manifests, but Expo Go requires an **`exp://` tunnel**.
3. Newer Expo Go versions downloaded from Play Store/App Store require the latest matching Expo SDK (e.g. **SDK 57**).

---

## 2. Key Learnings & Solved Issues

| Issue Faced | Cause | Permanent Solution |
| :--- | :--- | :--- |
| **`exp://10.0.10.x` failed on phone** | Internal Codespace private IP not reachable from phone | Run Expo with `--tunnel` mode using ngrok |
| **"Something went wrong" (blue screen)** | Standalone ngrok binary missed port routing in manifest | Use Expo's built-in tunnel: `npx expo start --tunnel` with `NGROK_AUTHTOKEN` |
| **"Project is incompatible with this version of Expo Go" (SDK 54 vs SDK 57)** | Phone Expo Go was SDK 57; project was on SDK 54 | Upgraded app to SDK 57 via `npx expo install expo@^57.0.0 --fix` and updated native dependencies |
| **StyleSheet compile error in React Native 0.86** | `StyleSheet.absoluteFillObject` deprecated in newer RN | Replaced with `StyleSheet.absoluteFill` |
| **Repeated interactive login prompt: "Log in with Expo account"** | `eas.projectId` in `app.config.js` triggered EAS prompt | Removed `eas.projectId` from `app.config.js` extra field for seamless anonymous local/dev connections |

---

## 3. Fast One-Command Launch for Future Sessions

### Step 1: Ensure Backend & MongoDB Are Running
```bash
# Start MongoDB container if not running
docker start mongodb 2>/dev/null || docker run -d --name mongodb -p 27017:27017 mongo:latest

# Start Backend Dev API
npm --prefix backend run dev
```

### Step 2: Launch Customer App via Tunnel
Run this in `customer application/`:
```bash
NGROK_AUTHTOKEN="<your-ngrok-token>" npx expo start --tunnel --port 8081
```

### Step 3: Launch Partner App via Tunnel
Run this in `mobile application/`:
```bash
NGROK_AUTHTOKEN="<your-ngrok-token>" npx expo start --tunnel --port 8082
```

---

## 4. Connecting on Mobile
1. Open **Expo Go** on your phone.
2. In **Enter URL manually**, enter the **`exp://…` URL from your current terminal** (tunnel mode) **or** the Codespace URL from `docs/ops/LOCAL_CUSTOMER_UI_DEV.md` — do not reuse old `exp.direct` links from past sessions.
3. The JavaScript bundle will download directly over the tunnel to your phone.

---

## 5. Instant Test Logins (Universal Mock OTP)

| Role | Mobile Number | Password / OTP |
| :--- | :--- | :--- |
| **Customer** | `+919876543299` | **`123456`** |
| **Tow Driver** | `+918888880001` | **`123456`** |
| **Chauffeur** | `+918888880002` | **`123456`** |
| **Vendor** | `+919812345670` | **`123456`** |
| **Admin Web Panel** | `admin@raceservice.com` | `Admin@123` |
