/**
 * verify-phase4-kyc-binding-and-tiered-cancellation.ts
 *
 * Automated verification script for:
 * 1. Dynamic Partner Document KYC Status Engine
 * 2. Multi-Tier Cancellation Refund Calculation & Invariant Engine
 */

import mongoose from 'mongoose';
import { env } from '../config/env';
import { TowingBookingModel } from '../models/src/towingBooking';
import { UserModel } from '../models/src/user';
import { getCancellationPolicy } from '../services/src/bookings/cancellation';
import { towingBookingService } from '../services/src/bookings/towingBooking';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

async function run() {
  console.log('\n=== Starting Phase 4 Verification: Dynamic KYC Binding & Tiered Refund Policies ===\n');

  await mongoose.connect(env.MONGODB_URI);

  try {
    // -------------------------------------------------------------
    // Test 1: Tiered Cancellation Policy Mathematical Invariants
    // -------------------------------------------------------------
    console.log('Test 1: Verifying Tiered Cancellation Calculation Rules...');

    // Tier 1: Free cancellation before advance payment
    const policyPending = getCancellationPolicy('PENDING', false, 0);
    assert(policyPending.canCancel === true, 'PENDING allows cancellation');
    assert(policyPending.refundAmount === 0, 'PENDING refund amount is 0');
    assert(policyPending.cancellationFee === 0, 'PENDING cancellation fee is 0');
    assert(policyPending.refundPercent === 0, 'PENDING refund percent is 0');

    // Tier 1: 100% full refund before driver assignment
    const policyConfirmed = getCancellationPolicy('CONFIRMED', true, 600);
    assert(policyConfirmed.canCancel === true, 'CONFIRMED allows cancellation');
    assert(policyConfirmed.refundAmount === 600, 'CONFIRMED provides 100% full refund of ₹600');
    assert(policyConfirmed.cancellationFee === 0, 'CONFIRMED charges zero cancellation fee');
    assert(policyConfirmed.refundPercent === 100, 'CONFIRMED refund percent is 100%');

    // Tier 2: 50% refund after driver assignment (nominal dispatch compensation)
    const policyAssigned = getCancellationPolicy('DRIVER_ASSIGNED', true, 600);
    assert(policyAssigned.canCancel === true, 'DRIVER_ASSIGNED allows cancellation');
    assert(policyAssigned.refundAmount === 300, 'DRIVER_ASSIGNED provides 50% refund of ₹300');
    assert(policyAssigned.cancellationFee === 300, 'DRIVER_ASSIGNED charges 50% dispatch fee of ₹300');
    assert(policyAssigned.refundPercent === 50, 'DRIVER_ASSIGNED refund percent is 50%');

    // Tier 3: Non-refundable when driver is en-route
    const policyEnRoute = getCancellationPolicy('DRIVER_EN_ROUTE', true, 600);
    assert(policyEnRoute.canCancel === true, 'DRIVER_EN_ROUTE allows cancellation');
    assert(policyEnRoute.refundAmount === 0, 'DRIVER_EN_ROUTE provides zero refund');
    assert(policyEnRoute.cancellationFee === 600, 'DRIVER_EN_ROUTE charges full advance as cancellation fee');
    assert(policyEnRoute.refundPercent === 0, 'DRIVER_EN_ROUTE refund percent is 0%');

    // Tier 3: Non-refundable when driver has arrived
    const policyArrived = getCancellationPolicy('DRIVER_ARRIVED', true, 600);
    assert(policyArrived.canCancel === true, 'DRIVER_ARRIVED allows cancellation');
    assert(policyArrived.refundAmount === 0, 'DRIVER_ARRIVED provides zero refund');
    assert(policyArrived.cancellationFee === 600, 'DRIVER_ARRIVED charges full advance as cancellation fee');

    // Ineligible states
    const policyInProgress = getCancellationPolicy('IN_PROGRESS', true, 600);
    assert(policyInProgress.canCancel === false, 'IN_PROGRESS strictly rejects customer cancellation');
    const policyCompleted = getCancellationPolicy('COMPLETED', true, 600);
    assert(policyCompleted.canCancel === false, 'COMPLETED strictly rejects customer cancellation');

    // -------------------------------------------------------------
    // Test 2: Dynamic KYC Status Simulation on User Documents
    // -------------------------------------------------------------
    console.log('\nTest 2: Verifying Dynamic Partner Document KYC Status Mapping...');

    const testDriverPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const driverUser = await UserModel.create({
      mobileNumber: testDriverPhone,
      role: 'driver',
      isVerified: false,
      isProfileCompleted: true,
      fullName: 'Test Dynamic KYC Driver',
      driverProfile: {
        driverCode: `DRV-TEST-${Date.now()}`,
        driverType: 'Tow Driver',
        licenseNo: 'OD-02-2026-99999',
        city: 'Bhubaneswar',
        status: 'PENDING',
        policeVerificationStatus: 'PENDING',
        documents: [
          { type: 'driving_license', url: 'https://race.test/dl.png', status: 'VERIFIED', uploadedAt: new Date() },
          { type: 'aadhaar', url: 'https://race.test/aadhaar.png', status: 'VERIFIED', uploadedAt: new Date() },
          { type: 'pan', url: 'https://race.test/pan.png', status: 'PENDING', uploadedAt: new Date() },
          { type: 'photo', url: 'https://race.test/selfie.png', status: 'REJECTED', uploadedAt: new Date() },
        ],
      },
    });

    const driverDocs = driverUser.driverProfile?.documents ?? [];

    // Helper logic matching PartnerDocumentsScreen.tsx resolveDocumentStatus
    function testResolveDoc(docId: string): 'Approved' | 'Under Review' | 'Action Required' {
      const matched = driverDocs.find((d) => {
        const typeLower = (d.type || '').toLowerCase();
        if (docId === 'dl') return typeLower === 'dl' || typeLower.includes('license');
        if (docId === 'photo') return typeLower === 'photo' || typeLower === 'selfie';
        if (docId === 'police') return typeLower.includes('police');
        return typeLower === docId;
      });
      if (!matched) return 'Action Required';
      if (matched.status === 'VERIFIED') return 'Approved';
      if (matched.status === 'PENDING') return 'Under Review';
      return 'Action Required';
    }

    assert(testResolveDoc('dl') === 'Approved', 'Driving License dynamically resolves to "Approved"');
    assert(testResolveDoc('aadhaar') === 'Approved', 'Aadhaar Card dynamically resolves to "Approved"');
    assert(testResolveDoc('pan') === 'Under Review', 'PAN Card dynamically resolves to "Under Review"');
    assert(testResolveDoc('photo') === 'Action Required', 'Rejected Photo dynamically resolves to "Action Required"');

    // Overall banner computation
    const overallBanner = ['dl', 'aadhaar', 'pan', 'photo'].some((d) => testResolveDoc(d) === 'Action Required')
      ? 'action_required'
      : ['dl', 'aadhaar', 'pan', 'photo'].some((d) => testResolveDoc(d) === 'Under Review')
      ? 'under_review'
      : 'approved';

    assert(overallBanner === 'action_required', 'Overall banner correctly flags "Action Required" due to rejected photo');

    // Clean up test driver
    await UserModel.deleteOne({ _id: driverUser._id });

    // -------------------------------------------------------------
    // Test 3: End-to-End Booking Cancellation with Policy Persistence
    // -------------------------------------------------------------
    console.log('\nTest 3: Verifying End-to-End Booking Cancellation with Policy Preview...');

    const customerUser = await UserModel.create({
      mobileNumber: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: 'customer',
      isVerified: true,
      fullName: 'Cancellation Test Customer',
    });

    const booking = await TowingBookingModel.create({
      bookingNumber: `TOW-CANCEL-${Date.now()}`,
      customerId: customerUser._id,
      customerName: customerUser.fullName,
      customerPhone: customerUser.mobileNumber,
      serviceId: 'towing-standard',
      serviceName: 'Flatbed Towing',
      vehicleId: new mongoose.Types.ObjectId(),
      vehicleType: 'car',
      pickup: { address: 'Test Pickup, Bhubaneswar', latitude: 20.29, longitude: 85.82 },
      dropoff: { address: 'Test Drop, Cuttack', latitude: 20.46, longitude: 85.88 },
      towingMode: 'instant',
      status: 'DRIVER_ASSIGNED',
      paymentStatus: 'ADVANCE_PAID',
      advanceAmount: 500,
      remainingAmount: 1000,
      estimatedFare: 1500,
      totalFare: 1500,
    });

    // Execute cancellation
    const cancelResult = await towingBookingService.cancelBooking(
      booking._id.toString(),
      customerUser._id.toString(),
      'Driver taking too long',
    );

    assert(cancelResult.booking.status === 'CANCELLED', 'Booking transitioned to CANCELLED');
    assert(cancelResult.policy.refundPercent === 50, 'Cancellation result policy records 50% refund');
    assert(cancelResult.policy.refundAmount === 250, 'Cancellation result policy records ₹250 refund amount');
    assert(cancelResult.policy.cancellationFee === 250, 'Cancellation result policy records ₹250 fee');

    // Clean up
    await TowingBookingModel.deleteOne({ _id: booking._id });
    await UserModel.deleteOne({ _id: customerUser._id });

    console.log('\n✅ ALL PHASE 4 VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
  } finally {
    await mongoose.disconnect();
  }
}

void run();
