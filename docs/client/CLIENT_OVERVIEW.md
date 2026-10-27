# RACE Service — Client Overview

> **Premium roadside assistance & towing platform**

---

## What is RACE?

RACE connects **vehicle owners** (customers) who need help on the road with a network of **verified partners** — drivers, towing vendors, and roadside assistance providers.

**Product surfaces in v2 (this branch):** two mobile apps, one admin panel, one backend. Customer/partner **web portals were removed** — they were incomplete Phase-1 copies, never deployed, and not required.

## Who Uses RACE?

| Audience | App | Platform |
|---|---|---|
| **Vehicle owners** (customers) | `customer application/` (Expo React Native) | iOS, Android |
| **Towing vendors & on-road drivers** (partners) | `mobile application/` (Expo React Native) | iOS, Android |
| **Operations team** | `race-admin/` (React + Turborepo) | Web |
| **Platform engineering** | `backend/` (Node + Express + MongoDB) | Server |

All three UIs talk to the same `backend/` API (REST + JWT, MongoDB, Redis, Socket.IO, GCS uploads, Twilio OTP).

---

## Core Services Offered

1. **Towing** — long-distance, flatbed, accident-recovery towing
2. **On-demand driver** — when the owner can't drive
3. **Roadside assistance** — jump-start, tyre change, fuel delivery, lockout (catalog exists; some types still “coming soon” on the API)
4. **Subscription plans** — customer and partner packages
5. **SOS / Emergency** — alert with live location context
6. **Vehicle QR** — scannable QR per saved vehicle

---

## What's Already Built

- **Backend API** — REST endpoints, MongoDB models, JWT + refresh tokens, RBAC (customer / driver / vendor / admin), Socket.IO rooms, Twilio OTP, GCS or local uploads, Mongoose + Redis (in-memory fallback in dev).
- **Customer mobile** — onboarding, OTP login, vehicles + QR, SOS, services catalog, towing/driver booking wizards, profile, subscriptions.
- **Partner mobile** — vendor & driver registration, documents, jobs, active-job workflow, fleet (drivers/vehicles), verification status.
- **Admin web** — dashboard, customers, vendors, drivers, bookings, finance, reports, notifications, subscriptions, settings, RBAC.
- **Postman collection** — `backend/postman/RACE-Backend.postman_collection.json`
- **Seed data** — `npm run seed`

## What's Pending / Not Production-Ready

- Payment gateway (Razorpay / Stripe) — `/api/v1/payments/*` is stubbed
- Automated tests — `backend/src/__tests__` is empty
- Full live map tracking (Socket.IO rooms exist; tracking is still a scaffold)
- Real push (FCM) — event notifications mostly log in dev

---

## Quick Local Start

```bash
# 1. Backend (port 3000)
cd backend
cp .env.example .env        # MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, GOOGLE_*, TWILIO_*
npm install
npm run seed
npm run dev                 # http://localhost:3000

# 2. Admin web (port 3001)
cd ../race-admin
npm install
npm run dev

# 3. Customer mobile
cd "../customer application"
npm install
npx expo start

# 4. Partner mobile
cd "../mobile application"
npm install
npx expo start
```

---

## Repository & Branch Notes

- Active work: `v2.0.1-cleanup` (branched from `release4Aug2026`).
- Kept for history: `release4Aug2026`, `release/13July26`, `main`.
- Root `npm install` does **not** install the apps; `cd` into each folder.
