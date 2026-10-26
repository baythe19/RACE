import { connectDatabase, disconnectDatabase } from '../database/src/connection';
import { TowingBookingModel } from '../models/src/towingBooking';
import { UserModel } from '../models/src/user';
import { VehicleModel } from '../models/src/vehicle';
import { driverService } from '../services/src/driver';
import { combinedBookingService } from '../services/src/combinedBooking';

async function run() {
  console.log('--- STARTING DROPOFF PAYMENT & COMPLETION OTP E2E TEST ---');
  await connectDatabase();

  const timestamp = Date.now();
  const testCustomer = await UserModel.create({
    mobileNumber: `9199${String(timestamp).slice(-6)}`,
    role: 'customer',
    fullName: 'Test Dropoff Customer',
    isVerified: true,
  });

  const testDriver = await UserModel.create({
    mobileNumber: `9188${String(timestamp).slice(-6)}`,
    role: 'driver',
    fullName: 'Test Dropoff Driver',
    isVerified: true,
    operationalStatus: 'ENABLED',
    reviewStatus: 'VERIFIED',
    driverContext: 'INDEPENDENT',
    selfDriverCategory: 'FULL_TIME',
    driverProfile: {
      driverCode: `DRV-DROP-${String(timestamp).slice(-4)}`,
      licenseNo: `OD-02-${String(timestamp).slice(-6)}`,
      driverType: 'Full-Time',
      city: 'Bhubaneswar',
      status: 'APPROVED',
      rating: 4.9,
    },
  });

  const testVehicle = await VehicleModel.create({
    customerId: testCustomer._id,
    brand: 'Hyundai',
    vehicleModel: 'i20',
    vehicleNumber: `OD02DP${String(timestamp).slice(-4)}`,
    vehicleType: 'car',
    fuelType: 'petrol',
    qrCode: `QR-DROP-${timestamp}`,
  });

  // Create active booking in IN_PROGRESS state
  const booking = await TowingBookingModel.create({
    customerId: testCustomer._id,
    bookingNumber: `TOW-DROP-${timestamp}`,
    vehicleId: testVehicle._id,
    pickup: { address: 'Saheed Nagar, Bhubaneswar', latitude: 20.2961, longitude: 85.8245 },
    dropoff: { address: 'Patia, Bhubaneswar', latitude: 20.3588, longitude: 85.8333 },
    distanceKm: 9.5,
    estimatedFare: 1450,
    advanceAmount: 0,
    advancePaid: false,
    remainingAmount: 1450,
    remainingPaid: false,
    paymentStatus: 'PENDING_FINAL',
    status: 'IN_PROGRESS',
    driverId: testDriver._id,
    tripStartOtp: '1234',
    tripStartOtpVerified: true,
    statusHistory: [
      { status: 'CONFIRMED', timestamp: new Date(Date.now() - 1800000) },
      { status: 'DRIVER_ASSIGNED', timestamp: new Date(Date.now() - 1500000) },
      { status: 'DRIVER_EN_ROUTE', timestamp: new Date(Date.now() - 1200000) },
      { status: 'DRIVER_ARRIVED', timestamp: new Date(Date.now() - 900000) },
      { status: 'IN_PROGRESS', timestamp: new Date(Date.now() - 600000) },
    ],
  });

  await UserModel.findByIdAndUpdate(testDriver._id, { activeBookingId: booking._id, isAvailable: false });

  console.log('1. Booking created in IN_PROGRESS state:', booking.bookingNumber);

  // Step 1: Driver marks arrival at dropoff
  const arrivalResult = await driverService.arrivedAtDropoff(
    testDriver._id.toString(),
    'driver',
    booking._id.toString(),
    'towing',
  );
  if (!arrivalResult.success || !arrivalResult.arrivedAtDropoffAt) {
    throw new Error('Failed to mark arrival at dropoff');
  }
  console.log('✓ Driver marked arrival at dropoff successfully at:', arrivalResult.arrivedAtDropoffAt);

  // Verify booking has arrivedAtDropoffAt and completionOtp
  const arrivedBooking = await TowingBookingModel.findById(booking._id);
  if (!arrivedBooking?.arrivedAtDropoffAt || !arrivedBooking?.completionOtp) {
    throw new Error('Booking missing arrivedAtDropoffAt or completionOtp');
  }
  console.log('✓ Database confirmed arrivedAtDropoffAt and completionOtp.');

  // Step 2: Customer selects payment mode (e.g. CASH)
  const paymentConfirmResult = await combinedBookingService.confirmPaymentMode(
    testCustomer._id.toString(),
    booking._id.toString(),
    'CASH',
    'towing',
  );
  if (
    !paymentConfirmResult.success ||
    paymentConfirmResult.paymentMode !== 'CASH' ||
    paymentConfirmResult.completionOtp !== arrivedBooking.completionOtp
  ) {
    throw new Error('Customer payment confirmation failed');
  }
  console.log('✓ Customer confirmed payment mode CASH. Customer received completion OTP:', paymentConfirmResult.completionOtp);

  const customerPaidBooking = await TowingBookingModel.findById(booking._id);
  if (
    customerPaidBooking?.paymentCollectionMode !== 'CASH' ||
    !customerPaidBooking?.paymentConfirmedByCustomer
  ) {
    throw new Error('Payment collection mode or confirmation flag not saved');
  }
  console.log('✓ Database confirmed paymentCollectionMode: CASH, paymentConfirmedByCustomer: true.');

  // Step 3: Driver attempts completion with invalid OTP -> should fail
  let failed = false;
  try {
    await driverService.completeBooking(
      testDriver._id.toString(),
      'driver',
      booking._id.toString(),
      'towing',
      '0000',
    );
  } catch (err: any) {
    failed = true;
    console.log('✓ Driver completion with invalid OTP properly rejected:', err.message);
  }
  if (!failed) {
    throw new Error('Completion with invalid OTP was unexpectedly accepted!');
  }

  // Step 4: Driver completes booking with correct completion OTP
  const completeResult = await driverService.completeBooking(
    testDriver._id.toString(),
    'driver',
    booking._id.toString(),
    'towing',
    paymentConfirmResult.completionOtp,
  );
  if (completeResult.status !== 'COMPLETED' || !completeResult.completionOtpVerified) {
    throw new Error('Booking status is not COMPLETED or completionOtpVerified is false');
  }
  console.log('✓ Driver completed booking with valid completion OTP.');

  // Step 5: Verify atomic resource release
  const freedDriver = await UserModel.findById(testDriver._id);
  if (freedDriver?.activeBookingId != null) {
    throw new Error('Driver was not released upon job completion');
  }
  console.log('✓ Driver activeBookingId successfully cleared (atomic release).');

  // Clean up test data
  await TowingBookingModel.findByIdAndDelete(booking._id);
  await VehicleModel.findByIdAndDelete(testVehicle._id);
  await UserModel.findByIdAndDelete(testCustomer._id);
  await UserModel.findByIdAndDelete(testDriver._id);

  console.log('--- ALL DROPOFF PAYMENT & COMPLETION OTP CHECKS PASSED (100%) ---');
  await disconnectDatabase();
}

run().catch(async (err) => {
  console.error('TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
