# Partner app navigation map

## Root (`PartnerAppNavigator`)

| Route | Purpose |
|-------|---------|
| `PartnerBootstrap` | Auth splash / login stack |
| `PartnerRegistration` | Driver or vendor onboarding |
| `PartnerDriverVerification` | Suspended / rejected driver gate |
| `PartnerMain` | Bottom tabs (logged-in partner) |

Back from auth uses the auth stack’s own `goBack()`. Entering `PartnerMain` replaces the root flow after login.

## Bottom tabs (`PartnerNavigator`)

| Tab | Role | Stack / screen |
|-----|------|----------------|
| `PartnerHome` | Driver → `DriverDashboardScreen`; Vendor → `PartnerHomeScreen` | Single screen |
| `PartnerJobs` | Both (when partner) | `PartnerJobsStackNavigator` |
| `PartnerDrivers` | Vendor only | `PartnerDriversStackNavigator` |
| `PartnerVehicles` | Vendor only | `PartnerVehiclesStackNavigator` |
| `PartnerVendor` | Driver with fleet invite / membership | `DriverMyVendorScreen` |
| `PartnerAccount` | Both | `PartnerAccountStackNavigator` |

Tab presses **preserve** each tab’s stack (except Account: tapping Account resets to `PartnerAccountMain`).

## Jobs stack

`PartnerJobsList` → `PartnerActiveJob` | `VendorAssignJob` | `VendorAddDriver` | `VendorDrivers` | `VendorVehicles` | `VendorVehicleRegistration`

Use **`navigation.navigate` inside this stack** so back returns to the previous jobs screen.

## Drivers stack

`VendorDriversList` → `VendorAddDriver` | `VendorAssignJob` | `VendorVehicles` | `VendorVehicleRegistration`

Assign driver to a job from **Fleet Drivers** uses `VendorAssignJob` here (not a jump to the Jobs tab), so back returns to the drivers list.

## Account stack

`PartnerAccountMain` → profile, documents, earnings, notifications, settings, help, bank, vendor tools (`VendorDrivers`, `VendorAddDriver`, `VendorAssignJob`, vehicles, verification).

## Cross-tab helpers (`partnerNavigationRef.ts`)

- `jumpToPartnerJobsScreen` / `openDriverActiveJob` — switch to Jobs tab and open a screen (stack history is preserved when possible).
- `jumpToPartnerAccountScreen` / `openPartnerNotifications` — switch to Account tab.
- `jumpToPartnerMainTab` — switch tab only.

Prefer **in-stack** `navigation.navigate` when the target route is registered on the **current** stack (e.g. assign job from Drivers tab).

## Full-screen routes (tab bar hidden)

`PartnerActiveJob`, `VendorAssignJob`, `VendorAddDriver`, and vendor driver wizard (`VendorDrivers` with `fullScreen: true`).

## Back button

Stack headers use `StackBackButton` → `navigation.goBack()`. Screen layouts with custom back should call `goBack()` when `canGoBack()`, not `navigate` to an arbitrary list unless finishing a one-shot flow.
