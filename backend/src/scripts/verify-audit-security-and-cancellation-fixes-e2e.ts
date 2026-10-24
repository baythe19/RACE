import mongoose, { Types } from 'mongoose';
import { env } from '../config/env';
import { UserModel } from '../models/src/user';
import { TowingBookingModel } from '../models/src/towingBooking';
import { VendorVehicleModel } from '../models/src/vendorVehicle';
import { driverService } from '../services/src/driver';
import { towingBookingService } from '../services/src/bookings/towingBooking';
import { reserveFleetVehicleForBooking } from '../services/src/bookings/driverAssignment';
import { adminBookingsService } from '../services/src/admin/adminBookings';
import { combinedBookingService } from '../services/src/combinedBooking';

async function run() {
  console.log('--- STARTING AUDIT SECURITY & CONCURRENCY FIXES E2E VERIFICATION ---');
  await mongoose.connect(env.MONGODB_URI);

  const timestamp = Date.now();
  const testCustomer = await UserModel.create({
    mobileNumber: `9198${String(timestamp).slice(-6)}`,
    fullName: 'Audit Customer',
    role: 'customer',
    isVerified: true,
  });

  const testDriver = await UserModel.create({
    mobileNumber: `9197${String(timestamp).slice(-6)}`,
    fullName: 'Audit Driver',
    role: 'driver',
    isVerified: true,
    isAvailable: false,
    operationalStatus: 'ENABLED',
    reviewStatus: 'VERIFIED',
    driverContext: 'INDEPENDENT',
    selfDriverCategory: 'FULL_TIME',
    driverProfile: {
      driverCode: `DRV-SEC-${String(timestamp).slice(-4)}`,
      licenseNo: `OD-02-SEC-${String(timestamp).slice(-6)}`,
      driverType: 'Tow Driver',
      city: 'Bhubaneswar',
      status: 'APPROVED',
      rating: 4.8,
    },
  });

  const testVendor = await UserModel.create({
    mobileNumber: `9196${String(timestamp).slice(-6)}`,
    fullName: 'Audit Vendor',
    role: 'vendor',
    isVerified: true,
  });

  const testVehicle = await VendorVehicleModel.create({
    vendorId: testVendor._id,
    registrationNo: `OD-02-SEC-${String(timestamp).slice(-4)}`,
    type: 'Flatbed Tow Truck',
    vehicleModel: 'Tata 407',
    status: 'ACTIVE',
  });

  console.log('1. Test entities created successfully.');

  // TEST 1: Completion OTP Bypass Prevention
  // Create booking in IN_PROGRESS state with arrivedAtDropoffAt and completionOtp
  const booking1 = await TowingBookingModel.create({
    bookingNumber: `TOW-SEC-1-${timestamp}`,
    customerId: testCustomer._id,
    vehicleId: new Types.ObjectId(),
    pickup: { address: 'Khandagiri, Bhubaneswar', latitude: 20.25, longitude: 85.78 },
    dropoff: { address: 'Patia, Bhubaneswar', latitude: 20.35, longitude: 85.82 },
    estimatedFare: 1500,
    advanceAmount: 300,
    advancePaid: true,
    remainingAmount: 1200,
    remainingPaid: false,
    paymentStatus: 'PENDING_FINAL',
    status: 'IN_PROGRESS',
    driverId: testDriver._id,
    tripStartOtp: '1111',
    tripStartOtpVerified: true,
    arrivedAtDropoffAt: new Date(),
    completionOtp: '9876',
    completionOtpAttempts: 0,
    statusHistory: [
      { status: 'CONFIRMED', timestamp: new Date(Date.now() - 600000) },
      { status: 'DRIVER_ARRIVED', timestamp: new Date(Date.now() - 300000) },
      { status: 'IN_PROGRESS', timestamp: new Date(Date.now() - 100000) },
    ],
  });

  await UserModel.findByIdAndUpdate(testDriver._id, { activeBookingId: booking1._id, isAvailable: false });

  // Attempt to complete without completionOtp (omitted/undefined) -> MUST FAIL!
  let omittedOtpFailed = false;
  try {
    await driverService.updateBookingStatus(
      testDriver._id.toString(),
      'driver',
      booking1._id.toString(),
      {
        status: 'COMPLETED',
        bookingType: 'towing',
        // completionOtp intentionally omitted!
      },
    );
  } catch (err: any) {
    omittedOtpFailed = true;
    console.log('✓ TEST 1 PASSED: Completion with omitted OTP properly rejected:', err.message);
  }
  if (!omittedOtpFailed) {
    throw new Error('SECURITY VULNERABILITY: Booking was completed without passing completionOtp!');
  }

  // TEST 2: Brute-Force Rate Limiting (5 Attempts Lockout)
  console.log('2. Testing OTP brute-force lockout (5 attempts limit)...');
  let lockoutTriggered = false;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await driverService.completeBooking(
        testDriver._id.toString(),
        'driver',
        booking1._id.toString(),
        'towing',
        `000${attempt}`, // wrong OTP
      );
    } catch (err: any) {
      if (attempt === 6 && err.message.includes('Too many failed completion OTP attempts')) {
        lockoutTriggered = true;
        console.log('✓ TEST 2 PASSED: 6th attempt successfully locked out by rate-limiter:', err.message);
      }
    }
  }
  if (!lockoutTriggered) {
    throw new Error('SECURITY VULNERABILITY: OTP brute-force lockout was not triggered after 5 attempts!');
  }

  // TEST 3: Fleet Vehicle Release on Towing Cancellation (Even with no driver assigned)
  console.log('3. Testing fleet truck automatic release on booking cancellation...');
  const booking2 = await TowingBookingModel.create({
    bookingNumber: `TOW-TRUCK-LOCK-${timestamp}`,
    customerId: testCustomer._id,
    vehicleId: new Types.ObjectId(),
    pickup: { address: 'Master Canteen, Bhubaneswar', latitude: 20.27, longitude: 85.83 },
    dropoff: { address: 'Baramunda, Bhubaneswar', latitude: 20.28, longitude: 85.79 },
    estimatedFare: 2000,
    advanceAmount: 400,
    advancePaid: false,
    remainingAmount: 1600,
    remainingPaid: false,
    paymentStatus: 'PENDING_ADVANCE',
    status: 'CONFIRMED',
    // Intentionally no driver assigned!
    assignedFleetVehicleId: testVehicle._id,
    assignedFleetVehicleLabel: `${testVehicle.registrationNo} · ${testVehicle.type}`,
    statusHistory: [{ status: 'CONFIRMED', timestamp: new Date() }],
  });

  // Pin truck to booking2
  await VendorVehicleModel.findByIdAndUpdate(testVehicle._id, {
    activeBookingId: booking2._id,
    activeBookingType: 'towing',
  });

  const pinnedTruck = await VendorVehicleModel.findById(testVehicle._id);
  if (!pinnedTruck?.activeBookingId) {
    throw new Error('Failed to pin test truck');
  }
  console.log('✓ Fleet truck successfully pinned to booking #', booking2.bookingNumber);

  // Customer cancels the booking
  await towingBookingService.cancelBooking(
    booking2._id.toString(),
    testCustomer._id.toString(),
    'Customer plans changed',
  );

  const releasedTruck = await VendorVehicleModel.findById(testVehicle._id);
  if (releasedTruck?.activeBookingId != null) {
    throw new Error('CONCURRENCY LEAK: Fleet vehicle was not released when booking was cancelled!');
  }
  console.log('✓ TEST 3 PASSED: Fleet truck was cleanly released from activeBookingId on cancellation.');

  // TEST 4: Admin Booking Detail includes assignedFleetVehicleLabel
  console.log('4. Testing admin booking detail returns assignedFleetVehicleLabel...');
  const adminDetail = await adminBookingsService.getById(booking2._id.toString(), 'towing');
  if (!adminDetail.assignedFleetVehicleLabel) {
    throw new Error('Admin booking detail missing assignedFleetVehicleLabel!');
  }
  console.log('✓ TEST 4 PASSED: Admin booking detail successfully mapped assignedFleetVehicleLabel:', adminDetail.assignedFleetVehicleLabel);

  console.log('\n--- ALL AUDIT SECURITY & CONCURRENCY FIXES VERIFIED 100% GREEN! ---');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
