/**
 * ensure-test-accounts.ts — NON-DESTRUCTIVE idempotent ensure for QA accounts.
 *
 * Unlike seed-test-accounts.ts (which WIPES all registration/booking data),
 * this script only upserts the 4 QA test accounts if missing and refreshes
 * their profile fields. It never deletes anything:
 *   - OTA/setup customers (real test traffic) are preserved
 *   - pending bookings/subscriptions are preserved
 *
 * Purpose: run against the PRODUCTION Atlas DB (Render) so APK QA has the
 * same 4 test accounts as local. Safe to run any number of times.
 *
 * Run: npm run ensure:test-accounts   (or tsx src/scripts/ensure-test-accounts.ts)
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

async function upsertTestUser(mobileNumber: string, doc: Record<string, unknown>) {
  return UserModel.findOneAndUpdate(
    { mobileNumber },
    { $set: doc },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function main(): Promise<void> {
  await connectDatabase();
  console.log('\n=== Ensuring QA test accounts (non-destructive) ===\n');

  console.log('1. TEST VENDOR (9000000001)...');
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

  // Vendor fleet trucks — replace only QA-marked trucks, keep anything else
  const existingQaTrucks = await VendorVehicleModel.find({
    vendorId: vendor!._id,
    registrationNo: { $in: ['QA01TR0001', 'QA01TR0002'] },
  });
  if (existingQaTrucks.length < 2) {
    await VendorVehicleModel.deleteMany({
      vendorId: vendor!._id,
      registrationNo: { $in: ['QA01TR0001', 'QA01TR0002'] },
    });
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
  }
  console.log('   vendor + QA trucks ensured');

  console.log('2. FULL-TIME driver (9000000002)...');
  await upsertTestUser(TEST_DRIVER_FT, {
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
      statusHistory: [{ status: 'APPROVED', note: 'QA ensure', changedAt: new Date() }],
    },
  });
  console.log('   ensured');

  console.log('3. PART-TIME driver (9000000003)...');
  await upsertTestUser(TEST_DRIVER_PT, {
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
      statusHistory: [{ status: 'APPROVED', note: 'QA ensure', changedAt: new Date() }],
    },
  });
  console.log('   ensured');

  console.log('4. VENDOR-MANAGED driver (9000000004)...');
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
      statusHistory: [{ status: 'APPROVED', note: 'QA ensure', changedAt: new Date() }],
    },
  });
  console.log(`   ensured (vendor: ${vendor!._id})`);

  const membership = await DriverVendorMembershipModel.findOne({
    driverUserId: vdDriver!._id,
    status: 'ACTIVE',
  });
  if (!membership) {
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
    console.log('   vendor fleet membership created');
  } else {
    console.log('   vendor fleet membership already ACTIVE');
  }

  await subscriptionService.ensurePlansSeeded();

  console.log('\n=== QA TEST ACCOUNTS ENSURED (nothing deleted) ===');
  console.log('  Vendor 9000000001 | FT 9000000002 | PT 9000000003 | VM 9000000004');
  console.log('  Universal OTP: 123456 | VM login: qa.driver.vf / Test@123');

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error('Ensure failed:', error);
  await disconnectDatabase();
  process.exit(1);
});
