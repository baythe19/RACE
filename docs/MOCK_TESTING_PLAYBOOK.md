# RACE System: Mock Testing Playbook & Mode Switching Guide

Welcome to the **RACE Comprehensive Testing Suite**. This playbook guides you through testing both mobile apps (**Customer App** & **Partner App**) and the **Admin Web Panel** using instant seeded mock data or switching to real data.

---

## 1. Quick Credentials Reference

| App / Role | Login Identifier | Password / OTP | Pre-loaded Data & Features |
| :--- | :--- | :--- | :--- |
| **Admin Panel** | `admin@raceservice.com` | `Admin@123` | Full Super Admin rights, dashboard metrics, driver/vendor approval, settings |
| **Customer App** | `+919876543299` | **`123456`** | Rahul Sharma, 2 Vehicles (`OD-02-AB-1234` Creta, `OD-02-XY-5678` Activa), Active Towing trip |
| **Partner App (Tow Driver)** | `+918888880001` | **`123456`** | Om Singh, Verified & Approved, Linked to Tata 407 Tow Truck, Active Job |
| **Partner App (Chauffeur)** | `+918888880002` | **`123456`** | Ramesh Kumar, Verified & Approved, Status: Available, Ready for offers |
| **Partner App (Fleet Vendor)**| `+919812345670` | **`123456`** | Kalinga Towing Services, Verified, 2 Fleet Vehicles, 1 Attached Driver |

> [!NOTE]
> **Universal Mock OTP**: In Mock Mode, you can enter **`123456`** for ANY test account without waiting for SMS or looking into terminal logs!

---

## 2. One-Click Mock Database Reset & Seed

Whenever you want to reset all test bookings, vehicles, and users back to a clean state:

```bash
# In backend directory:
npm --prefix backend run seed:mock
```

To wipe everything and re-seed from scratch:
```bash
npm --prefix backend run seed:fresh
```

---

## 3. How to Switch Between Mock Mode and Real Mode

You can toggle modes in **1 second** by changing `MOCK_DATA_MODE` in `backend/.env`:

### To Run in Mock Mode (Default for Testing):
```env
# backend/.env
MOCK_DATA_MODE=true
MOCK_UNIVERSAL_OTP=123456
```
- No SMS sent via Twilio (zero charges).
- Universal OTP `123456` works.
- Payment gateway runs on stub/mock response (no live credit card required).

### To Run in Real Mode:
```env
# backend/.env
MOCK_DATA_MODE=false
```
- Real random 6-digit OTPs generated.
- SMS delivered to real phone numbers via Twilio.
- Real Payment gateway flows engaged.

---

## 4. How to Test Each Surface

### Surface 1: Admin Web Panel
- **URL**: `http://localhost:3001` (or forwarded Codespace port `3001`)
- **Login**: `admin@raceservice.com` / `Admin@123`
- **What to check**:
  1. **Dashboard**: Live KPIs, total drivers (10+), vendors (5+), and revenue summaries.
  2. **Drivers Tab**: View pre-seeded drivers ("Om Singh", "Ramesh Kumar") with their ratings and license info.
  3. **Vendors Tab**: View "Kalinga Towing & Logistics Services" with approved verification stage.
  4. **Bookings Tab**: View active towing booking `RACE-TOW-MOCK-001` in `DRIVER_EN_ROUTE` status.

---

### Surface 2: Customer Mobile App
Run the Customer App:
```bash
cd "customer application"
npx expo start --tunnel
```
*(Or use `npx expo start --port 8081` to test on web/local emulator).*

- **Login**: Enter `9876543299` -> Enter OTP `123456`.
- **What to check**:
  1. **Home Screen**: Pre-registered vehicles ("Hyundai Creta", "Honda Activa") appear immediately.
  2. **Active Tracking Screen**: The seeded towing trip (`RACE-TOW-MOCK-001`) will open directly showing the driver en-route to pickup!
  3. **New Booking**: Book a roadside assistance service (Battery Jumpstart / Flat Tyre) and see live fare estimates.

---

### Surface 3: Partner Mobile App (Driver / Vendor)
Run the Partner App:
```bash
cd "mobile application"
npx expo start --tunnel
```
*(Or use `npx expo start --port 8082`).*

#### Test Flow A: Tow Driver (`8888880001` -> OTP `123456`)
- Opens driver home screen.
- Active job banner for `RACE-TOW-MOCK-001` is visible.
- Tap to navigate, verify start OTP (`4589`), or complete service.

#### Test Flow B: Chauffeur Driver (`8888880002` -> OTP `123456`)
- Toggle **Online / Offline** status switch.
- Receive open driver booking requests.

#### Test Flow C: Towing Vendor (`9812345670` -> OTP `123456`)
- Opens Vendor Dashboard.
- View Fleet Vehicles (`Tata 407 Recovery`, `Mahindra Bolero Maxi Truck`).
- View and manage assigned drivers.
