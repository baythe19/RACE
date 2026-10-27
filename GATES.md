# Gates: admin-db-alignment-fixes

OWNS: backend/src/services/src/admin/**, backend/src/services/src/bookingDisplayStatus.ts, race-admin/**

Scope: Fix admin customer bookings, reports topVendors/counts, admin booking status, finance refunds/avg value, and vendor city so API matches Mongo truth.

- [x] G1: Customer list totalBookings uses towing+driver counts (not always zero)
  CHECK: node -e "const fs=require('fs');const s=fs.readFileSync('backend/src/services/src/admin/adminCustomers.ts','utf8');if(!s.includes('TowingBookingModel')||!s.includes('DriverBookingModel')) process.exit(2);if(!/totalBookings/.test(s)) process.exit(3);console.log('customer bookings wired')"
  EXPECT: customer bookings wired
  EVIDENCE: 2026-10-27 gate OK; live customers_with_bookings=6; detail returns towing booking

- [x] G2: Reports topVendors computed from booking aggregates (vendorStats)
  CHECK: node -e "const fs=require('fs');const s=fs.readFileSync('backend/src/services/src/admin/adminReports.ts','utf8');if(!s.includes('vendorStats')||!s.includes('towingByVendor')) process.exit(2);if(/topVendors: topVendors\\.map\\([\\s\\S]*?bookings: 0/.test(s)) process.exit(3);console.log('topVendors aggregated')"
  EXPECT: topVendors aggregated
  EVIDENCE: 2026-10-27 live topVendors [('Kalinga…',1,1250)]; summary vendors=6 drivers=16 avg=40

- [x] G3: Admin bookings do not map DRIVER_ASSIGNED/CONFIRMED to PENDING for admin list status
  CHECK: node -e "const fs=require('fs');const b=fs.readFileSync('backend/src/services/src/admin/adminBookings.ts','utf8');if(/status:\\s*mapPublicBookingStatus\\(booking\\.status\\)/.test(b)) process.exit(2);console.log('admin status not public-collapsed')"
  EXPECT: admin status not public-collapsed
  EVIDENCE: 2026-10-27 TOW-CANCEL status=DRIVER_ASSIGNED; TOW-WH status=CONFIRMED (publicStatus still PENDING)

- [x] G4: Finance summary counts initiated refunds from paymenttransactions
  CHECK: node -e "const fs=require('fs');const s=fs.readFileSync('backend/src/services/src/admin/adminFinance.ts','utf8');if(!s.includes('initiated')) process.exit(2);console.log('finance refunds considered')"
  EXPECT: finance refunds considered
  EVIDENCE: 2026-10-27 finance totalRefunds=1450 (was 0)

- [x] G5: Backend lint + admin tsc clean
  CHECK: npm run lint
  EXPECT: 
  CWD: backend
  EVIDENCE: 2026-10-27 BACKEND_LINT:0 ADMIN_TSC:0
