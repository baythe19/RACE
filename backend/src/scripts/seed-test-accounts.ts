/**
 * seed-test-accounts.ts — Predefined QA accounts for APK testing (user request 2026-10-27).
 *
 * Wipes OLD stale user/booking data (nothing here is real production data —
 * user explicitly said no real registrations exist yet) and creates:
 *   - 1 verified TOWING VENDOR  (full profile, 2 fleet trucks)
 *   - 1 FULL-TIME self driver   (independent, approved)
 *   - 1 PART-TIME self driver   (independent, approved)
 *   - 1 VENDOR-MANAGED driver   (fleet: vendor, has loginId/password)
 *
 * All four use 900000xxxx fake numbers on TEST_OTP_WHITELIST → universal OTP
 * (MOCK_UNIVERSAL_OTP, default 123456). Vendor-managed driver additionally has
 * loginId/password credentials for the driver credential login screen.
 *
 * Run: npm run seed:test-accounts
 */
import { connectDatabase, disconnectDatabase } from '../database/src/connection';
import { UserModel } from '../models/src/user';
import { VendorVehicleModel } from '../models/src/vendorVehicle';
import { DriverVendorMembershipModel } from '../models/src/driverVendorMembership';
import { hashDriverPassword } from '../utils/src/driverPassword';
import { subscriptionService } from '../services/src/subscription';

const TEST_VENDOR = '+919000000001';
const TEST_DRIVER_FT = '+919000000002';
const TEST_DRIVER_PT = '+919000000003';
const TEST_DRIVER_VENDOR = '+919000000004';
const TEST_DRIVER_PASSWORD = 'Test@123';

async function wipeStaleData(): Promise<void> {
  const collections = [
    'users',
    'otplogs',
    'vehicles',
    'vehicleqrcodes',
    'towingbookings',
    'driverbookings',
    'bookings',
    'vendorvehicles',
    'transactions',
    'driverenquiries',
    'vendordocuments',
    'notificationprefs',
    'adminnotifications',
    'paymenttransactions',
    'savedlocations',
    'notifications',
    'wallets',
    'paymentmethods',
    'activitylogs',
    'usersubscriptions',
    'drivervendormemberships',
  ];
  const db = UserModel.db;
  for (const name of collections) {
    try {
      const result = await db.collection(name).deleteMany({});
      console.log(`  wiped ${name}: ${result.deletedCount}`);
    } catch {
      // collection may not exist yet — fine
    }
  }
}

async function upsertTestUser(mobileNumber: string, doc: Record<string, unknown>) {
  return UserModel.findOneAndUpdate(
    { mobileNumber },
    { $set: doc },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function main(): Promise<void> {
  await connectDatabase();
  console.log('\n=== Seeding QA test accounts (APK testing) ===\n');

  console.log('1. Wiping stale registration/booking data...');
  await wipeStaleData();

  console.log('2. Creating TEST VENDOR (fake 9000000001)...');
  const vendor = await upsertTestUser(TEST_VENDOR, {
    mobileNumber: TEST_VENDOR,
    fullName: 'Test Vendor Singh',
    role: 'vendor',
    capabilities: ['vendor'],
    isVerified: true,
    isProfileCompleted: true,
    accountStatus: 'ACTIVE',
    registrationStatus: 'SUBMITTED',
    reviewStatus: 'VERIFIED',
    operationalStatus: 'ENABLED',
    isAvailable: false,
    vendorProfile: {
      vendorType: 'towing_company',
      status: 'approved',
      verificationStage: 'approved',
      businessName: 'QA Towing Services',
      ownerName: 'Test Vendor Singh',
      address: 'Plot 12, Industrial Estate, Bhubaneswar, Odisha 751007',
    },
  });

  await VendorVehicleModel.deleteMany({ vendorId: vendor!._id });
  await VendorVehicleModel.create([
    {
      vendorId: vendor!._id,
      registrationNo: 'QA01TR0001',
      type: 'flatbed_tow_truck',
      vehicleModel: 'Tata LPT 710 Flatbed',
      year: 2023,
      status: 'ACTIVE',
    },
    {
      vendorId: vendor!._id,
      registrationNo: 'QA01TR0002',
      type: 'integrated_tow_truck',
      vehicleModel: 'Ashok Leyland Boss Integrated',
      year: 2024,
      status: 'ACTIVE',
    },
  ]);
  console.log(`   vendor ${TEST_VENDOR} + 2 fleet trucks seeded`);

  console.log('3. Creating FULL-TIME self driver (fake 9000000002)...');
  const ftDriver = await upsertTestUser(TEST_DRIVER_FT, {
    mobileNumber: TEST_DRIVER_FT,
    fullName: 'Test Driver FullTime',
    role: 'driver',
    capabilities: ['driver'],
    isVerified: true,
    isProfileCompleted: true,
    accountStatus: 'ACTIVE',
    registrationStatus: 'SUBMITTED',
    reviewStatus: 'VERIFIED',
    operationalStatus: 'ENABLED',
    isAvailable: false,
    selfDriverCategory: 'FULL_TIME',
    driverContext: 'INDEPENDENT',
    driverProfile: {
      driverCode: 'QA-DR-FT-001',
      licenseNo: 'QADLFT2026001',
      driverType: 'Full-Time',
      city: 'Bhubaneswar',
      state: 'Odisha',
      vehicleRegistration: 'QA01DV0001',
      status: 'APPROVED',
      rating: 4.8,
      reviewCount: 24,
      experienceYears: 5,
      languages: ['Hindi', 'English', 'Odia'],
      policeVerificationStatus: 'VERIFIED',
      documents: [
        { type: 'driving_license', url: 'https://qa.local/dl-ft.jpg', status: 'VERIFIED', uploadedAt: new Date() },
        { type: 'aadhaar', url: 'https://qa.local/aadhaar-ft.jpg', status: 'VERIFIED', uploadedAt: new Date() },
      ],
      statusHistory: [{ status: 'APPROVED', note: 'QA seed', changedAt: new Date() }],
    },
  });
  console.log(`   full-time driver ${TEST_DRIVER_FT} (${ftDriver!._id})`);

  console.log('4. Creating PART-TIME self driver (fake 9000000003)...');
  const ptDriver = await upsertTestUser(TEST_DRIVER_PT, {
    mobileNumber: TEST_DRIVER_PT,
    fullName: 'Test Driver PartTime',
    role: 'driver',
    capabilities: ['driver'],
    isVerified: true,
    isProfileCompleted: true,
    accountStatus: 'ACTIVE',
    registrationStatus: 'SUBMITTED',
    reviewStatus: 'VERIFIED',
    operationalStatus: 'ENABLED',
    isAvailable: false,
    selfDriverCategory: 'PART_TIME',
    driverContext: 'INDEPENDENT',
    driverProfile: {
      driverCode: 'QA-DR-PT-002',
      licenseNo: 'QADLPT2026002',
      driverType: 'Part-Time',
      city: 'Bhubaneswar',
      state: 'Odisha',
      availabilityWindow: 'evenings_weekends',
      status: 'APPROVED',
      rating: 4.5,
      reviewCount: 11,
      experienceYears: 2,
      languages: ['Hindi', 'Odia'],
      policeVerificationStatus: 'VERIFIED',
      documents: [
        { type: 'driving_license', url: 'https://qa.local/dl-pt.jpg', status: 'VERIFIED', uploadedAt: new Date() },
      ],
      statusHistory: [{ status: 'APPROVED', note: 'QA seed', changedAt: new Date() }],
    },
  });
  console.log(`   part-time driver ${TEST_DRIVER_PT} (${ptDriver!._id})`);

  console.log('5. Creating VENDOR-MANAGED driver (fake 9000000004)...');
  const vdDriver = await upsertTestUser(TEST_DRIVER_VENDOR, {
    mobileNumber: TEST_DRIVER_VENDOR,
    fullName: 'Test Driver VendorFleet',
    role: 'driver',
    capabilities: ['driver'],
    isVerified: true,
    isProfileCompleted: true,
    accountStatus: 'ACTIVE',
    registrationStatus: 'SUBMITTED',
    reviewStatus: 'VERIFIED',
    operationalStatus: 'ENABLED',
    isAvailable: false,
    driverContext: 'VENDOR_MANAGED',
    // top-level pointer mirrors vendorDrivers.ts onboarding (set on invite accept)
    vendorUserId: vendor!._id,
    driverProfile: {
      driverCode: 'QA-DR-VF-003',
      licenseNo: 'QADLVF2026003',
      vendorUserId: vendor!._id,
      fleetSource: 'vendor',
      loginId: 'qa.driver.vf',
      passwordHash: await hashDriverPassword(TEST_DRIVER_PASSWORD),
      driverType: 'Tow Driver',
      city: 'Bhubaneswar',
      state: 'Odisha',
      vehicleRegistration: 'QA01TR0001',
      status: 'APPROVED',
      rating: 4.9,
      reviewCount: 37,
      experienceYears: 7,
      languages: ['Hindi', 'English'],
      policeVerificationStatus: 'VERIFIED',
      documents: [
        { type: 'driving_license', url: 'https://qa.local/dl-vf.jpg', status: 'VERIFIED', uploadedAt: new Date() },
        { type: 'aadhaar', url: 'https://qa.local/aadhaar-vf.jpg', status: 'VERIFIED', uploadedAt: new Date() },
      ],
      statusHistory: [{ status: 'APPROVED', note: 'QA seed', changedAt: new Date() }],
    },
  });
  console.log(`   vendor-managed driver ${TEST_DRIVER_VENDOR} (vendor: ${vendor!._id})`);

  await DriverVendorMembershipModel.deleteMany({});
  await DriverVendorMembershipModel.create({
    vendorUserId: vendor!._id,
    driverUserId: vdDriver!._id,
    status: 'ACTIVE',
    invitedBy: vendor!._id,
    invitedAt: new Date(),
    decidedBy: vendor!._id,
    decidedAt: new Date(),
    driverLockKey: `driver:${vdDriver!._id}`,
  });
  console.log('   vendor fleet membership ACTIVE');

  await subscriptionService.ensurePlansSeeded();

  console.log('\n=== QA TEST ACCOUNTS — READY ===');
  console.log('──────────────────────────────────────────────────');
  console.log('  Universal OTP for ALL test accounts : 123456');
  console.log('──────────────────────────────────────────────────');
  console.log('  ROLE            NUMBER         LOGIN');
  console.log('  Vendor          9000000001     OTP only');
  console.log('  Driver (FT)     9000000002     OTP only');
  console.log('  Driver (PT)     9000000003     OTP only');
  console.log('  Vendor-Driver   9000000004     OTP or qa.driver.vf / Test@123');
  console.log('──────────────────────────────────────────────────');
  console.log('  Test data marker: phone numbers 900000xxxx, vehicle QA*, driverCode QA-*');

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error('Seed failed:', error);
  await disconnectDatabase();
  process.exit(1);
});
