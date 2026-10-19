# Preview partner personas (linked mock)

UI preview uses **one vendor** and **one driver** with shared IDs, bookings, invitations, and notifications.

| Role | Name | Mobile (OTP preview) | IDs |
|------|------|----------------------|-----|
| Vendor | Bikram Keshari Rout · Kalinga Towing & Logistics | `9812345670` | `preview-vendor-kalinga-001` |
| Driver | Abhishek Sharma · Tow Driver · `RC-DR-1101` | `9876543210` | `preview-driver-abhishek-001` |

Source of truth: `src/data/previewPartnerWorld.ts`

## End-to-end flows (two simulators / role switch)

### A — Fleet invite

1. **UI QA → My Vendor: first request** (resets world to invite pending).
2. **Vendor** (login as Bikram): Drivers → pending **Abhishek**; Notifications → invitation sent.
3. **Driver** (login as Abhishek): My Vendor → accept Kalinga invite.
4. **Vendor**: pull refresh Drivers / Notifications → **Driver accepted**; Abhishek **Active**.

Or: Vendor searches **Abhishek** / phone `9876543210` → Invite (same linked state).

### B — Assign job

1. **UI QA → My Vendor: connected** (default) or stay after flow A.
2. **Vendor**: Jobs → **TOW-10051** → Assign driver & vehicle → pick **Abhishek** + vehicle.
3. **Driver**: Notifications → **New fleet job**; Jobs / My Vendor → accept **TOW-10051**.
4. **Vendor**: Jobs → same booking **In progress** · Abhishek en route; Notifications → driver accepted.

### C — Assignment shortcut

**UI QA → My Vendor: new job** seeds **TOW-10051** as `DRIVER_ASSIGNED` on the driver side (skip vendor assign).

## Reset

UI QA driver jumps call `resetPreviewPartnerWorld('invite_pending' | 'connected' | 'assignment')`.
