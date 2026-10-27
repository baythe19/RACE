# RACE Service — Client Feature Catalogue

> **What's in the box — every feature a user can touch, by audience and app**

This catalogue is the **client-facing source of truth** for what's been built in the `release4Aug2026` codebase. Every line corresponds to a real screen, page, route, or backend capability — nothing speculative.

---

## 1. Customer Mobile App — `customer application/`

**Stack:** Expo React Native, Redux Toolkit, React Query, React Navigation 7. Targets iOS and Android.

### 1.1 Onboarding & Authentication
- **Phone OTP login** — unified `send-otp` / `verify-otp` (no separate flows for new vs returning users; backend auto-detects)
- **Profile completion** wizard after first login (name, email, address, etc.)
- **Multi-vehicle registration** — make/model/year/colour/fuel/registration number, with image upload
- **Vehicle QR generation** — every saved vehicle produces a scannable QR for fast identification & SOS trigger
- **PIN creation** for app-level security

### 1.2 Home & Discovery
- **Home screen** with category cards and active service shortcuts
- **Services catalogue** — grouped categories (4 categories, 19 services) served via `/api/v1/services`
- **More services** view for upcoming/coming-soon items
- **Location selection** (auto-detect + manual pick)

### 1.3 Booking — Towing
- **Create towing booking** with pickup/drop addresses, vehicle selection, notes
- **Fare preview** before confirming — `/api/v1/fare/towing`
- **Live tracking** of the assigned towing vehicle on a map
- **Status timeline** (assigned → en route → at pickup → in transit → completed)
- **Cancel with reason** + cancellation policy preview before confirming cancel
- **Rate the service** after completion (1–5 stars + comment)
- **Advance payment + final payment** (currently stubbed; real gateway pending)

### 1.4 Booking — On-demand Driver
- Same lifecycle as towing but specialised for driver-hire:
- **Driver dispatch** when you can't drive (fatigue, intoxication, injury)
- **Driver fare preview** — `/api/v1/fare/driver`
- Same tracking / status / cancel / rating flow

### 1.5 Roadside Assistance
- **Service availability check** — `/api/v1/bookings/roadside/availability` (public)
- **Categories**: jump-start, tyre change, fuel delivery, lockout help
- Real-time partner assignment

### 1.6 SOS / Emergency
- **SOS config** — server-driven list of emergency numbers / actions (`/api/v1/sos/config`, public)
- **SOS context** — captures current location + active booking if any (`/api/v1/sos/context`, protected)
- **SOS alert** — sends an emergency signal with full location data (`/api/v1/sos/alert`)
- **Emergency SOS screen** — single-tap activation from the Profile tab
- **SOS details** screen to review what was sent

### 1.7 Profile & Account
- **Personal information** (name, email, DOB, address)
- **My vehicles** — list with edit/delete/QR-view
- **Saved locations** — quick pick for pickup/drop
- **Payment methods** — add/list/delete cards (Razorpay wiring pending)
- **Wallet** — current balance + history
- **Subscription plans** — list + active plan + cancel
- **Choose plan** — onboarding-style plan picker
- **Notifications** — list + read-all + per-category preferences
- **Settings** — language, theme, notifications
- **Change mobile number** — re-OTP verification
- **Change password** (legacy flow if customer has password set)
- **Support centre** + **Help & support** links

---

## 2. Partner Mobile App — `mobile application/`

**Stack:** Expo React Native, Redux Toolkit, React Query, React Navigation 7.

This is what **towing vendors & on-road drivers** use to register, get jobs, and complete work.

### 3.1 Onboarding
- **Role selection screen** — Vendor (owns a fleet) vs Driver (individual driver)
- **Wrong app role** screen for mis-routed users (with deep link to the customer app)
- **Welcome + Splash**
- **OTP-based login** with `vendor-driver` vs `driver` auth modes

### 3.2 Vendor Registration (multi-step)
- **Vendor business info** — company name, GST/PAN, type of services
- **Vendor business address** — registered address with map pin
- **Vendor documents** — upload GST, PAN, business proof, address proof
- **Vendor review** — final summary before submit
- Post-submit, the vendor lands on a **Verification Status** screen

### 3.3 Driver Registration (multi-step)
- **Driver personal info** — name, DOB, emergency contact, experience, availability
- **Driver vehicle info** — own vehicle details if they drive their own
- **Driver documents** — Aadhaar, PAN, driving license, selfie, police verification
- **Driver review** — final summary

### 3.4 Daily Operations
- **Partner Home** — today's earnings, pending jobs, alerts
- **Partner Jobs** — incoming job feed
- **Active Job** — current job with pickup/drop/vehicle info, navigate-to-customer, status update controls
- **Vendor Assign Job** — vendor-only screen to assign a job to one of their fleet drivers
- **Vendor Drivers** — vendor-only screen listing all drivers in the fleet
- **Vendor Vehicles** — vendor-only screen listing all vehicles
- **Partner Account** — earnings, payouts, profile

---

## 3. Admin Web — `race-admin/`

**Stack:** Turborepo monorepo (apps + packages). React 19, Vite, Zustand, TanStack Query. Roles: super-admin, ops, finance, support, etc.

### 3.1 Dashboard
- KPIs (bookings, GMV, active partners, customer growth)
- Live booking feed
- Operational alerts

### 3.2 Customers
- Customers list (search, filter, paginate)
- Customer detail (profile, vehicles, bookings, payment history, ratings)
- Customer-side actions (force logout, KYC verify, suspend)

### 3.3 Vendors
- Vendor list (verification status filter)
- Vendor detail (business info, documents, fleet, drivers, ratings, earnings)

### 3.4 Drivers
- Drivers list (availability filter)
- Driver detail (documents, ratings, history)
- **Available drivers** (real-time) — list of drivers currently online

### 3.5 Bookings
- Bookings list (status/type/date filters)
- Booking detail (timeline, payments, assigned driver/vendor)
- **Admin actions**: assign driver, cancel booking, force-refund

### 3.6 Documents
- Browse uploaded vendor/driver documents
- **PDF download / inline view** for any document (GST, PAN, Aadhaar, etc.)

### 3.7 Finance
- Earnings dashboard, pending payouts, completed payouts
- Refund management
- GST/TDS reports

### 3.8 Reports
- Exportable CSV / Excel for finance & ops

### 3.9 Notifications
- Send platform-wide or targeted notifications (push + SMS + email)

### 3.10 Subscriptions
- Plan management (create, edit, retire plans)
- Subscriber list (active / churned)

### 3.11 Settings
- Platform-wide config (branding, support numbers, region-specific fees, service categories)

### 3.12 Admin Users & Activity
- Admin user list, role assignment (note: live login uses a hardcoded env super-admin; the Admin Mongo model is unused)
- Activity audit log

---

## 4. Backend — `backend/`

**Stack:** Node 22, Express 5, Mongoose 8 (MongoDB), Socket.IO 4, ioredis, Twilio (OTP), Google Cloud Storage (uploads), Helmet, express-rate-limit, Zod validation, JWT (access 15m + refresh), Pino structured logging.

### 4.1 Public APIs (no auth)
- `/health`
- `/api/v1/services` + `/api/v1/services/upcoming`
- `/api/v1/brand`
- `/api/v1/fare/towing` + `/api/v1/fare/driver`
- `/api/v1/vehicles/:id/verify`
- `/api/v1/bookings/roadside/availability`
- `/api/v1/subscriptions/plans`
- `/api/v1/sos/config`

### 4.2 Customer-Authenticated APIs
- `/api/v1/auth/*` — send-otp, verify-otp, refresh-token
- `/api/v1/profile` + `/api/v1/profile/complete`
- `/api/v1/profile/locations` (CRUD)
- `/api/v1/profile/payment-methods` (CRUD)
- `/api/v1/profile/wallet`
- `/api/v1/profile/notifications` + read-all + preferences
- `/api/v1/vehicles` (CRUD)
- `/api/v1/bookings/towing` (full lifecycle)
- `/api/v1/bookings/driver` (full lifecycle)
- `/api/v1/bookings/roadside` (POST protected; availability public)
- `/api/v1/subscriptions` (GET/POST + cancel)
- `/api/v1/sos/context` + `/api/v1/sos/alert`

### 4.3 Driver APIs (driver role)
- `/api/v1/driver/availability` (PATCH)
- `/api/v1/driver/location` (PATCH — drives Socket.IO tracking)
- `/api/v1/driver/bookings` (list)
- `/api/v1/driver/bookings/active`
- `/api/v1/driver/bookings/:id/status`

### 4.4 Admin APIs (admin role)
- `/api/v1/admin/bookings/:id/assign-driver`
- `/api/v1/admin/bookings/:id/cancel`
- `/api/v1/admin/drivers/available`

### 4.5 Payment Stubs
- `/api/v1/payments/advance` + `/verify`
- `/api/v1/payments/final` + `/verify`
- Real gateway wiring is **not** present — needs Razorpay / Stripe integration

### 4.6 Realtime
- **Socket.IO** for live driver location, booking status updates, admin live feed
- Connected after JWT auth (token handshake)

### 4.7 Operational Tooling
- `npm run seed` — populates demo customers, drivers, vendors, bookings, plans
- `npm run seed:demo-drivers` — more demo drivers
- `npm run seed:reset` — wipe and reseed
- `npm run db:reset` — drop + recreate MongoDB
- `npm run regenerate-vehicle-qrs` — regenerate all vehicle QRs (e.g. after QR scheme change)
- `npm run migrate:unified-users` — historical user-migration script
- `npm run reset-test-data`
- `npm run lint`

### 4.8 Data Models (MongoDB collections)
`user`, `userProfileSchema`, `vehicle`, `vehicleQr`, `booking`, `bookingRatingSchema`, `towingBooking`, `driverBooking`, `driver`, `vendor`, `vendorVehicle`, `vendorDocument`, `subscription`, `payment`, `paymentTransaction`, `transaction`, `wallet`, `notification`, `notificationPrefs`, `adminNotification`, `admin`, `otpLog`, `activityLog`, `location`, `service`, `brand`, `platformSettings`.

### 4.9 RBAC (Roles)
- `customer` — default for new phone-OTP users
- `driver` — for individual on-road drivers
- `vendor` — for fleet owners / towing companies
- `admin` — internal staff (with sub-roles: super-admin, ops, finance, support)
