/**
 * qaAccounts.ts — single source of truth for the 4 QA test accounts.
 * Used by qaBootstrapRoutes (ensure + wipe-stale endpoints) so both paths
 * create identical accounts with the same fleet link + credentials.
 */
import { UserModel } from '../../models/src/user';
import { VendorVehicleModel } from '../../models/src/vendorVehicle';
import { DriverVendorMembershipModel } from '../../models/src/driverVendorMembership';
import { VehicleModel } from '../../models/src/vehicle';
import { hashDriverPassword } from '../../utils/src/driverPassword';
import { computeProfileCompleted } from '../../utils/src/user';
import { vehicleService } from './vehicle';

export const QA_KEEP_MOBILES = [
  '+919000000001',
  '+919000000002',
  '+919000000003',
  '+919000000004',
];

/** Tier-B customer login for towing/driver E2E on Render (OTP 123456 when whitelisted). */
export const QA_CUSTOMER_MOBILE = '+919000000005';
const QA_CUSTOMER_VEHICLE_NO = 'OD02QA9005';
const QA_DRIVER_PASSWORD = 'Test@123';

async function upsertTestUser(mobileNumber: string, doc: Record<string, unknown>) {
  return UserModel.findOneAndUpdate(
    { mobileNumber },
    { $set: doc },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function upsertQaAccounts(): Promise<string[]> {
  const vendor = await upsertTestUser(QA_KEEP_MOBILES[0], {
    mobileNumber: QA_KEEP_MOBILES[0],
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

  const qaTrucks = await VendorVehicleModel.countDocuments({
    vendorId: vendor!._id,
    registrationNo: { $in: ['QA01TR0001', 'QA01TR0002'] },
  });
  if (qaTrucks < 2) {
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

  await upsertTestUser(QA_KEEP_MOBILES[1], {
    mobileNumber: QA_KEEP_MOBILES[1],
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

  await upsertTestUser(QA_KEEP_MOBILES[2], {
    mobileNumber: QA_KEEP_MOBILES[2],
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

  const vd = await upsertTestUser(QA_KEEP_MOBILES[3], {
    mobileNumber: QA_KEEP_MOBILES[3],
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
      passwordHash: await hashDriverPassword(QA_DRIVER_PASSWORD),
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

  const membership = await DriverVendorMembershipModel.findOne({
    driverUserId: vd!._id,
    status: 'ACTIVE',
  });
  if (!membership) {
    await DriverVendorMembershipModel.create({
      vendorUserId: vendor!._id,
      driverUserId: vd!._id,
      status: 'ACTIVE',
      invitedBy: vendor!._id,
      invitedAt: new Date(),
      decidedBy: vendor!._id,
      decidedAt: new Date(),
      driverLockKey: `driver:${vd!._id}`,
    });
  }

  const customerLine = await upsertQaCustomer();

  return [
    '9000000001 vendor',
    '9000000002 driver-FT',
    '9000000003 driver-PT',
    '9000000004 driver-VM',
    customerLine,
  ];
}

export async function upsertQaCustomer(): Promise<string> {
  const customer = await upsertTestUser(QA_CUSTOMER_MOBILE, {
    mobileNumber: QA_CUSTOMER_MOBILE,
    fullName: 'QA Customer Test',
    role: 'customer',
    capabilities: ['customer'],
    isVerified: true,
    accountStatus: 'ACTIVE',
    email: 'qa.customer5@raceservice.com',
    gender: 'male',
    dateOfBirth: new Date('1990-01-01'),
    address: {
      line1: 'Khandagiri Square',
      city: 'Bhubaneswar',
      state: 'Odisha',
      pincode: '751030',
      country: 'India',
    },
    emergencyContact: {
      name: 'Emergency QA',
      mobileNumber: '9876543210',
      relationship: 'Family',
    },
  });

  customer!.isProfileCompleted = computeProfileCompleted(customer!);
  await customer!.save();

  const hasVehicle = await VehicleModel.exists({
    customerId: customer!._id,
    vehicleNumber: QA_CUSTOMER_VEHICLE_NO,
  });
  if (!hasVehicle) {
    await vehicleService.createVehicle(customer!.id, {
      vehicleNumber: QA_CUSTOMER_VEHICLE_NO,
      vehicleType: 'car',
      brand: 'Maruti',
      model: 'Swift',
      fuelType: 'petrol',
      color: 'Red',
    });
  }

  return '9000000005 customer (profile + vehicle)';
}
