import assert from 'node:assert/strict';
import mongoose, { Types } from 'mongoose';
import { connectDatabase } from '../database/src/connection';
import { connectCache } from '../config/cache';
import { UserModel } from '../models/src/user';
import { TowingBookingModel } from '../models/src/towingBooking';
import { DriverBookingModel } from '../models/src/driverBooking';
import { VendorVehicleModel } from '../models/src/vendorVehicle';
import { DriverVendorMembershipModel } from '../models/src/driverVendorMembership';
import { vendorDriversService } from '../services/src/vendorDrivers';
import { vendorBookingsService } from '../services/src/vendorBookings';
import { driverService } from '../services/src/driver';
import { authService } from '../services/src/auth';
import { listOpenBookingOffers } from '../services/src/bookings/driverAssignment';

async function run(): Promise<void> {
  await connectDatabase();
  await connectCache();
  console.log('--- Starting Staff Onboarding & Master Redesign E2E Audit ---');

  const now = Date.now();
  const vendorPhone = `99990${String(now).slice(-5)}`;
  const staffPhone = `99991${String(now).slice(-5)}`;
  const ftDriverPhone = `99992${String(now).slice(-5)}`;
  const ptDriverPhone = `99993${String(now).slice(-5)}`;
  const customerPhone = `99994${String(now).slice(-5)}`;

  // 1. Create a Towing Vendor
  const vendor = await UserModel.create({
    mobileNumber: vendorPhone,
    role: 'vendor',
    capabilities: ['vendor'],
    fullName: 'Test Towing Vendor',
    isVerified: true,
    isProfileCompleted: true,
    operationalStatus: 'ENABLED',
    reviewStatus: 'VERIFIED',
    vendorProfile: {
      vendorType: 'towing_company',
      businessName: 'Super Towing Services',
      businessType: 'tow_truck_operator',
      status: 'approved',
      verificationStage: 'approved',
      city: 'Bhubaneswar',
      state: 'Odisha',
      rating: 4.9,
      totalDrivers: 0,
      totalVehicles: 1,
    },
  });

  // Create an active fleet tow truck
  const truck = await VendorVehicleModel.create({
    vendorId: vendor._id,
    registrationNo: `OD02TT${String(now).slice(-4)}`,
    type: 'flatbed',
    vehicleModel: 'Tata 407 Flatbed',
    year: 2023,
    status: 'ACTIVE',
  });

  // 2. Step 1 of direct onboarding: Vendor sends inline OTP to driver phone
  console.log('1. Testing vendor sending inline onboarding OTP...');
  const sendResult = await vendorDriversService.sendOnboardingOtp(vendor.id, {
    phone: staffPhone,
  });
  assert.ok(sendResult.phone.includes(staffPhone));
  assert.ok(sendResult.devOtp || sendResult.expiresIn);
  console.log('   ✅ Inline onboarding OTP sent successfully');

  // 3. Step 2: Vendor verifies inline OTP with dev OTP
  console.log('2. Testing vendor verifying inline OTP...');
  const otpToUse = sendResult.devOtp ?? '123456';
  const verifyResult = await vendorDriversService.verifyOnboardingOtp(vendor.id, {
    phone: staffPhone,
    otp: otpToUse,
  });
  assert.equal(verifyResult.verified, true);
  assert.ok(verifyResult.onboardingProofToken);
  console.log('   ✅ Inline OTP verified, received proof token');

  // 4. Step 3: Vendor submits staff driver registration using proof token
  console.log('3. Testing direct staff driver creation with proof token...');
  const staff = await vendorDriversService.createStaffDriver(vendor.id, {
    phone: staffPhone,
    fullName: 'Ramesh Staff Driver',
    licenseNo: `DL-OD-${String(now).slice(-6)}`,
    driverType: 'Tow Driver',
    onboardingProofToken: verifyResult.onboardingProofToken,
  });
  assert.equal(staff.fullName, 'Ramesh Staff Driver');
  assert.ok(staff.phone.includes(staffPhone));
  assert.equal(staff.fleetSource, 'vendor');

  // Verify staff record in database
  const staffUser = await UserModel.findById(staff.id).exec();
  assert.ok(staffUser);
  assert.equal(staffUser.driverContext, 'VENDOR_MANAGED');
  assert.equal(staffUser.vendorUserId?.toString(), vendor.id);
  assert.equal(staffUser.operationalStatus, 'ENABLED');
  assert.equal(staffUser.reviewStatus, 'PENDING'); // Non-blocking review

  // Verify atomic DriverVendorMembership created in ACTIVE status
  const membership = await DriverVendorMembershipModel.findOne({
    driverUserId: staffUser._id,
    vendorUserId: vendor._id,
  }).exec();
  assert.ok(membership);
  assert.equal(membership.status, 'ACTIVE');
  console.log('   ✅ Staff driver created directly into vendor fleet with ACTIVE membership');

  // 5. Zero-Friction Staff Driver First Login: Staff driver logs in via phone OTP
  console.log('4. Testing zero-friction staff driver phone OTP login...');
  const driverOtp = await authService.sendOtp({ mobileNumber: staffPhone, role: 'driver' });
  const loginResult = await authService.verifyOtp({
    mobileNumber: staffPhone,
    otp: driverOtp.devOtp ?? '123456',
    role: 'driver',
  });
  assert.equal(loginResult.onboardingRequired, false, 'Staff driver must bypass onboarding completely');
  assert.equal(loginResult.user.driverContext, 'VENDOR_MANAGED');
  assert.equal(loginResult.user.fullName, 'Ramesh Staff Driver');
  console.log('   ✅ Staff driver logs in with onboardingRequired=false (direct to dashboard)');

  // 6. Non-blocking Review Policy: Staff driver toggles Online while reviewStatus is PENDING
  console.log('5. Testing non-blocking review availability toggle...');
  const availResult = await driverService.updateAvailability(staffUser.id, 'driver', {
    isAvailable: true,
  });
  assert.equal(availResult.isAvailable, true);
  console.log('   ✅ Staff driver can go online while reviewStatus=PENDING');

  // 7. Staff Driver Isolation: Staff driver queries open marketplace offers
  console.log('6. Testing staff driver marketplace isolation...');
  const staffOffers = await driverService.listOpenOffers(staffUser.id, 'driver');
  assert.deepEqual(staffOffers, [], 'Vendor staff driver must receive 0 open marketplace offers');
  console.log('   ✅ Vendor staff driver receives 0 open marketplace offers');

  // 8. Create a Customer and a Towing Booking
  const customer = await UserModel.create({
    mobileNumber: customerPhone,
    role: 'customer',
    capabilities: ['customer'],
    fullName: 'Test Customer',
    isVerified: true,
  });

  const towingJob = await TowingBookingModel.create({
    customerId: customer._id,
    bookingNumber: `TOW-${String(now).slice(-5)}`,
    vehicleId: new Types.ObjectId(),
    towingMode: 'instant',
    status: 'CONFIRMED',
    pickup: {
      address: 'Janpath, Bhubaneswar',
      latitude: 20.2961,
      longitude: 85.8245,
    },
    dropoff: {
      address: 'Cuttack Road, Bhubaneswar',
      latitude: 20.3012,
      longitude: 85.8312,
    },
    estimatedFare: 1200,
    advanceAmount: 200,
    advancePaid: true,
    remainingAmount: 1000,
    paymentStatus: 'ADVANCE_PAID',
    statusHistory: [{ status: 'CONFIRMED', timestamp: new Date() }],
  });

  // 9. Vendor assigns towing job to staff driver + tow truck
  console.log('7. Testing vendor dispatch of towing job to staff driver + vehicle...');
  const assignResult = await vendorBookingsService.assignBooking(vendor.id, towingJob.id, {
    bookingType: 'towing',
    driverId: staffUser.id,
    vehicleId: truck.id,
  });
  assert.equal(assignResult.status, 'DRIVER_ASSIGNED');
  assert.equal(assignResult.driver?.id, staffUser.id);
  console.log('   ✅ Vendor successfully dispatched booking to staff driver');

  // 10. Staff driver accepts the assigned job -> DRIVER_EN_ROUTE
  console.log('8. Testing staff driver accepting assigned booking...');
  const acceptResult = await driverService.acceptBooking(staffUser.id, 'driver', towingJob.id, 'towing');
  assert.equal(acceptResult.status, 'DRIVER_EN_ROUTE');
  console.log('   ✅ Staff driver accepted job, status changed to DRIVER_EN_ROUTE');

  // 10a. Staff driver arrives at pickup
  console.log('8b. Testing staff driver arrival, customer trip OTP verification & completion...');
  await driverService.updateBookingStatus(staffUser.id, 'driver', towingJob.id, {
    status: 'DRIVER_ARRIVED',
    bookingType: 'towing',
  });
  const arrivedBooking = await TowingBookingModel.findById(towingJob.id).exec();
  assert.equal(arrivedBooking?.status, 'DRIVER_ARRIVED');

  // Customer provides Trip OTP -> Driver enters OTP -> IN_PROGRESS
  assert.ok(arrivedBooking?.tripStartOtp, 'Trip OTP must be generated upon acceptance');
  await driverService.updateBookingStatus(staffUser.id, 'driver', towingJob.id, {
    status: 'IN_PROGRESS',
    bookingType: 'towing',
    tripOtp: arrivedBooking.tripStartOtp,
  });
  const inProgressBooking = await TowingBookingModel.findById(towingJob.id).exec();
  assert.equal(inProgressBooking?.status, 'IN_PROGRESS');

  // Driver completes trip -> COMPLETED
  await driverService.updateBookingStatus(staffUser.id, 'driver', towingJob.id, {
    status: 'COMPLETED',
    bookingType: 'towing',
  });
  const completedBooking = await TowingBookingModel.findById(towingJob.id).exec();
  assert.equal(completedBooking?.status, 'COMPLETED');
  console.log('   ✅ Trip successfully verified with OTP and marked COMPLETED');

  // 10b. Verify atomic resource release
  console.log('8c. Verifying atomic resource release (truck and driver freed)...');
  const freedTruck = await VendorVehicleModel.findById(truck._id).exec();
  const freedDriver = await UserModel.findById(staffUser._id).exec();
  assert.equal(freedTruck?.activeBookingId, null, 'Tow truck activeBookingId must be null after completion');
  assert.equal(freedDriver?.activeBookingId, null, 'Driver activeBookingId must be null after completion');
  console.log('   ✅ Atomic resource release confirmed: truck and driver freed');

  // 11. Independent Full-Time & Part-Time driver segregation
  console.log('9. Testing independent Full-Time & Part-Time driver job segregation...');
  const ftDriver = await UserModel.create({
    mobileNumber: ftDriverPhone,
    role: 'driver',
    capabilities: ['driver'],
    fullName: 'Independent FT Driver',
    isVerified: true,
    isProfileCompleted: true,
    driverContext: 'INDEPENDENT',
    selfDriverCategory: 'FULL_TIME',
    operationalStatus: 'ENABLED',
    reviewStatus: 'VERIFIED',
    isAvailable: true,
    driverProfile: {
      driverCode: `DRV-FT-${String(now).slice(-4)}`,
      licenseNo: `DL-FT-${String(now).slice(-5)}`,
      driverType: 'Full-Time',
      city: 'Bhubaneswar',
      status: 'APPROVED',
      rating: 4.8,
    },
  });

  const ptDriver = await UserModel.create({
    mobileNumber: ptDriverPhone,
    role: 'driver',
    capabilities: ['driver'],
    fullName: 'Independent PT Driver',
    isVerified: true,
    isProfileCompleted: true,
    driverContext: 'INDEPENDENT',
    selfDriverCategory: 'PART_TIME',
    operationalStatus: 'ENABLED',
    reviewStatus: 'VERIFIED',
    isAvailable: true,
    driverProfile: {
      driverCode: `DRV-PT-${String(now).slice(-4)}`,
      licenseNo: `DL-PT-${String(now).slice(-5)}`,
      driverType: 'Part-Time',
      city: 'Bhubaneswar',
      status: 'APPROVED',
      rating: 4.7,
    },
  });

  // Create a Full-Time driver booking and a Part-Time driver booking
  const ftJob = await DriverBookingModel.create({
    customerId: customer._id,
    bookingNumber: `DRV-FT-${String(now).slice(-5)}`,
    driverServiceType: 'full_time',
    packageHours: 8,
    status: 'CONFIRMED',
    pickup: { address: 'Saheed Nagar', latitude: 20.297, longitude: 85.83 },
    estimatedFare: 800,
    advanceAmount: 200,
    advancePaid: true,
    remainingAmount: 600,
    paymentStatus: 'ADVANCE_PAID',
    statusHistory: [{ status: 'CONFIRMED', timestamp: new Date() }],
  });

  const ptJob = await DriverBookingModel.create({
    customerId: customer._id,
    bookingNumber: `DRV-PT-${String(now).slice(-5)}`,
    driverServiceType: 'part_time',
    packageHours: 2,
    status: 'CONFIRMED',
    pickup: { address: 'Patia', latitude: 20.35, longitude: 85.81 },
    estimatedFare: 300,
    advanceAmount: 100,
    advancePaid: true,
    remainingAmount: 200,
    paymentStatus: 'ADVANCE_PAID',
    statusHistory: [{ status: 'CONFIRMED', timestamp: new Date() }],
  });

  // Query offers for FT driver
  const ftOffers = await listOpenBookingOffers({ forDriver: ftDriver });
  const ftJobIds = ftOffers.map((o) => o.id);
  assert.ok(ftJobIds.includes(ftJob.id), 'FT driver must see full_time driver jobs');
  assert.ok(!ftJobIds.includes(ptJob.id), 'FT driver must NOT see part_time driver jobs');
  assert.ok(!ftJobIds.includes(towingJob.id), 'Independent driver must NEVER see towing jobs');
  console.log('   ✅ FT Driver correctly sees only Full-Time jobs, 0 towing jobs');

  // Query offers for PT driver
  const ptOffers = await listOpenBookingOffers({ forDriver: ptDriver });
  const ptJobIds = ptOffers.map((o) => o.id);
  assert.ok(ptJobIds.includes(ptJob.id), 'PT driver must see part_time driver jobs');
  assert.ok(!ptJobIds.includes(ftJob.id), 'PT driver must NOT see full_time driver jobs');
  assert.ok(!ptJobIds.includes(towingJob.id), 'Independent driver must NEVER see towing jobs');
  console.log('   ✅ PT Driver correctly sees only Part-Time jobs, 0 towing jobs');

  // 12. Test independent FT driver accepting Full-Time job
  console.log('10. Testing independent FT driver accepting Full-Time job...');
  const ftAccept = await driverService.acceptBooking(ftDriver.id, 'driver', ftJob.id, 'driver');
  assert.equal(ftAccept.status, 'DRIVER_EN_ROUTE');
  console.log('   ✅ Independent FT driver accepted job, status changed to DRIVER_EN_ROUTE');

  // 13. Test independent PT driver accepting Part-Time job
  console.log('11. Testing independent PT driver accepting Part-Time job...');
  const ptAccept = await driverService.acceptBooking(ptDriver.id, 'driver', ptJob.id, 'driver');
  assert.equal(ptAccept.status, 'DRIVER_EN_ROUTE');
  console.log('   ✅ Independent PT driver accepted job, status changed to DRIVER_EN_ROUTE');

  // 14. Verify Driver Vehicle Isolation (drivers have NO vehicle ownership records)
  console.log('12. Verifying Driver Vehicle Isolation (no vehicles on driver accounts)...');
  const staffDoc = await UserModel.findById(staffUser._id).lean().exec();
  const ftDoc = await UserModel.findById(ftDriver._id).lean().exec();
  const ptDoc = await UserModel.findById(ptDriver._id).lean().exec();
  assert.equal(staffDoc?.driverProfile?.vehicleRegistration, undefined);
  assert.equal(ftDoc?.driverProfile?.vehicleRegistration, undefined);
  assert.equal(ptDoc?.driverProfile?.vehicleRegistration, undefined);
  console.log('   ✅ Driver accounts strictly have NO vehicle ownership records (vendor fleet only)');

  console.log('--- ALL 12 MASTER REDESIGN & FULL LIFECYCLE E2E AUDIT CHECKS PASSED (12/12) ---');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Audit failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
