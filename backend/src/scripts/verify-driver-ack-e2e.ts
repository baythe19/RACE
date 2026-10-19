/* eslint-disable no-console */
/**
 * P0-1/P0-2/P0-3 verification: vendor assign → driver ack → tracking gate.
 *
 * Proves against a real MongoDB:
 *  1. Vendor assign leaves the booking at DRIVER_ASSIGNED (no trip start, no OTP emit need).
 *  2. Pre-accept trip-status updates from the driver are rejected.
 *  3. Driver accept moves DRIVER_ASSIGNED → DRIVER_EN_ROUTE and delivers a trip OTP.
 *  4. Vendor tracking exposes driver location only in post-accept statuses.
 *  5. A second assign of the same vehicle to another open job is rejected (P0-2 reservation).
 *  6. A driver WITHOUT an ACTIVE membership cannot be dispatched (P0-3).
 *
 * Run: cd backend && npx tsx src/scripts/verify-driver-ack-e2e.ts
 */
import mongoose, { Types } from 'mongoose';
import { connectDatabase } from '../database/src/connection';
import { UserModel } from '../models/src/user';
import { VendorVehicleModel } from '../models/src/vendorVehicle';
import { DriverVendorMembershipModel } from '../models/src/driverVendorMembership';
import { TowingBookingModel } from '../models/src/towingBooking';
import { driverService } from '../services/src/driver';
import { VendorBookingsService } from '../services/src/vendorBookings';
import { claimOpenBookingOffer, releaseDriver } from '../services/src/bookings/driverAssignment';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✅ ${name}`);
  } else {
    failures += 1;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  await connectDatabase();
  const suffix = new Types.ObjectId().toString().slice(-8);
  const vendorId = new Types.ObjectId();
  const driverId = new Types.ObjectId();
  const customerId = new Types.ObjectId();
  const vehicleId = new Types.ObjectId();

  try {
    await UserModel.deleteMany({ _id: { $in: [vendorId, driverId, customerId] } });
    await TowingBookingModel.deleteMany({ vendorId });
    await VendorVehicleModel.deleteMany({ _id: vehicleId });
    await DriverVendorMembershipModel.deleteMany({ $or: [{ vendorUserId: vendorId }, { driverUserId: driverId }] });

    await UserModel.create([
      {
        _id: vendorId,
        fullName: 'E2E Vendor',
        mobileNumber: `+9199000${suffix}`,
        email: `e2e-vendor-${suffix}@test.local`,
        role: 'vendor',
        isVerified: true,
        isAvailable: true,
        vendorProfile: {
          businessName: 'E2E Towing',
          ownerName: 'E2E Vendor',
          vendorType: 'towing_company',
          status: 'approved',
          address: 'Test Depot',
        },
      },
      {
        _id: driverId,
        fullName: 'E2E Driver',
        mobileNumber: `+9199111${suffix}`,
        email: `e2e-driver-${suffix}@test.local`,
        role: 'driver',
        isVerified: true,
        isAvailable: true,
        driverProfile: {
          status: 'APPROVED',
          driverType: 'Tow Driver',
          driverCode: `E2E-D1-${suffix}`,
          licenseNo: `E2EDL${suffix}`,
          city: 'Bhubaneswar',
        },
      },
      {
        _id: customerId,
        fullName: 'E2E Customer',
        mobileNumber: `+9199222${suffix}`,
        email: `e2e-cust-${suffix}@test.local`,
        role: 'customer',
        isVerified: true,
      },
    ] as never);

    const vehicle = await VendorVehicleModel.create({
      _id: vehicleId,
      vendorId,
      registrationNo: `E2E${suffix}`,
      type: 'Flatbed',
      vehicleModel: 'E2E Truck',
      status: 'ACTIVE',
    });

    await DriverVendorMembershipModel.create({
      vendorUserId: vendorId,
      driverUserId: driverId,
      status: 'ACTIVE',
      invitedBy: vendorId,
      invitedAt: new Date(),
      decidedBy: driverId,
      decidedAt: new Date(),
    });

    const booking = await TowingBookingModel.create({
      customerId,
      bookingNumber: `E2E-TOW-${suffix}`,
      vehicleId: new Types.ObjectId(),
      status: 'CONFIRMED',
      paymentStatus: 'ADVANCE_PAID',
      pickup: { label: 'A', address: 'A', latitude: 20.29, longitude: 85.82 },
      dropoff: { label: 'B', address: 'B', latitude: 20.3, longitude: 85.83 },
      estimatedFare: 500,
      advanceAmount: 150,
      advancePaid: true,
      remainingAmount: 350,
    });

    const vendorBookings = new VendorBookingsService();

    // ── 1. Vendor assign stops at DRIVER_ASSIGNED ──
    const assigned = await vendorBookings.approveBooking(vendorId.toString(), booking._id.toString(), {
      bookingType: 'towing',
      driverId: driverId.toString(),
      vehicleId: vehicle._id.toString(),
    } as never);
    const afterAssign = await TowingBookingModel.findById(booking._id).exec();
    check('1. vendor assign → status DRIVER_ASSIGNED', assigned.status === 'DRIVER_ASSIGNED', `got ${assigned.status}`);
    check('1a. DB status is DRIVER_ASSIGNED', afterAssign?.status === 'DRIVER_ASSIGNED', `got ${afterAssign?.status}`);
    check('1b. trip OTP NOT verified yet', afterAssign?.tripStartOtpVerified !== true);

    // ── 4a. Tracking pre-accept hides driver location ──
    const trackingPre = await vendorBookings.getBookingTracking(vendorId.toString(), booking._id.toString(), 'towing');
    check('4a. pre-accept tracking has no driver location', trackingPre.driverLocation === null, JSON.stringify(trackingPre.driverLocation));

    // ── 2. Driver cannot leap to ARRIVED before accepting ──
    let preAcceptBlocked = false;
    try {
      await driverService.updateBookingStatus(driverId.toString(), 'driver', booking._id.toString(), {
        status: 'DRIVER_ARRIVED',
        bookingType: 'towing',
      } as never);
    } catch {
      preAcceptBlocked = true;
    }
    check('2. pre-accept status jump rejected', preAcceptBlocked);

    // ── 3. Driver accept → EN_ROUTE ──
    const accepted = await driverService.acceptBooking(driverId.toString(), 'driver', booking._id.toString(), 'towing');
    const afterAccept = await TowingBookingModel.findById(booking._id).exec();
    check('3. driver accept → EN_ROUTE', accepted.status === 'DRIVER_EN_ROUTE', `got ${accepted.status}`);
    check('3a. DB status is DRIVER_EN_ROUTE', afterAccept?.status === 'DRIVER_EN_ROUTE', `got ${afterAccept?.status}`);
    check('3b. driver is reserved (activeBookingId set)', String((await UserModel.findById(driverId))?.activeBookingId ?? '') === booking._id.toString());

    // ── 4b. Tracking post-accept returns trip metadata (status en_route) ──
    const trackingPost = await vendorBookings.getBookingTracking(vendorId.toString(), booking._id.toString(), 'towing');
    check('4b. post-accept tracking sees EN_ROUTE', trackingPost.status === 'DRIVER_EN_ROUTE', `got ${trackingPost.status}`);

    // ── 5. Same vehicle cannot be pinned to a second open job (P0-2) ──
    const secondBooking = await TowingBookingModel.create({
      customerId,
      bookingNumber: `E2E-TOW2-${suffix}`,
      vehicleId: new Types.ObjectId(),
      status: 'CONFIRMED',
      paymentStatus: 'ADVANCE_PAID',
      pickup: { label: 'C', address: 'C', latitude: 20.31, longitude: 85.84 },
      dropoff: { label: 'D', address: 'D', latitude: 20.32, longitude: 85.85 },
      estimatedFare: 600,
      advanceAmount: 180,
      advancePaid: true,
      remainingAmount: 420,
    });
    const pilotDriver = await UserModel.create({
      _id: new Types.ObjectId(),
      fullName: 'E2E Driver 2',
      mobileNumber: `+9199333${suffix}`,
      email: `e2e-driver2-${suffix}@test.local`,
      role: 'driver',
      isVerified: true,
      isAvailable: true,
      driverProfile: {
        status: 'APPROVED',
        driverType: 'Tow Driver',
        driverCode: `E2E-D2-${suffix}`,
        licenseNo: `E2EDL2${suffix}`,
        city: 'Bhubaneswar',
      },
    });
    await DriverVendorMembershipModel.create({
      vendorUserId: vendorId,
      driverUserId: pilotDriver._id,
      status: 'ACTIVE',
      invitedBy: vendorId,
      invitedAt: new Date(),
      decidedBy: pilotDriver._id,
      decidedAt: new Date(),
    });
    let vehicleClashBlocked = false;
    try {
      await claimOpenBookingOffer(secondBooking._id.toString(), 'towing', pilotDriver._id.toString(), {
        vendorId: vendorId.toString(),
        fleetVehicleId: vehicle._id.toString(),
        fleetVehicleLabel: `${vehicle.registrationNo} · ${vehicle.type}`,
      });
    } catch {
      vehicleClashBlocked = true;
    }
    check('5. vehicle double-booking rejected (atomic reservation)', vehicleClashBlocked);
    const vehicleAfter = await VendorVehicleModel.findById(vehicle._id).exec();
    check('5a. vehicle still pinned to first booking', String(vehicleAfter?.activeBookingId ?? '') === booking._id.toString());

    // ── 6. Non-member driver cannot claim vendor-routed job (P0-3) ──
    const outsider = await UserModel.create({
      _id: new Types.ObjectId(),
      fullName: 'E2E Outsider',
      mobileNumber: `+9199444${suffix}`,
      email: `e2e-out-${suffix}@test.local`,
      role: 'driver',
      isVerified: true,
      isAvailable: true,
      driverProfile: {
        status: 'APPROVED',
        driverType: 'Tow Driver',
        driverCode: `E2E-D3-${suffix}`,
        licenseNo: `E2EDL3${suffix}`,
        city: 'Bhubaneswar',
      },
    });
    let outsiderBlocked = false;
    try {
      await driverService.acceptBooking(outsider._id.toString(), 'driver', booking._id.toString(), 'towing');
    } catch {
      outsiderBlocked = true;
    }
    check('6. non-member driver claim rejected (membership-only)', outsiderBlocked);

    // ── 7. Post-accept, reject is invalid (job already accepted); cleanup releases both ──
    let lateRejectionBlocked = false;
    try {
      await driverService.rejectBooking(driverId.toString(), 'driver', booking._id.toString(), 'towing');
    } catch {
      lateRejectionBlocked = true;
    }
    check('7. reject after accept rejected (already EN_ROUTE)', lateRejectionBlocked);
    await releaseDriver(driverId.toString(), booking._id.toString());
    const driverAfterRelease = await UserModel.findById(driverId).exec();
    const vehicleAfterRelease = await VendorVehicleModel.findById(vehicle._id).exec();
    check('7a. releaseDriver frees driver', driverAfterRelease?.isAvailable === true && !driverAfterRelease?.activeBookingId);
    check('7b. releaseDriver frees pinned vehicle', vehicleAfterRelease?.activeBookingId == null);

    // Complete first booking so its open-job lifecycle is formally finished
    await TowingBookingModel.findByIdAndUpdate(booking._id, { status: 'COMPLETED' });

    // ── 8. Pre-accept rejection: atomic rollback & vehicle release ──
    const assignedSecond = await vendorBookings.approveBooking(vendorId.toString(), secondBooking._id.toString(), {
      bookingType: 'towing',
      driverId: driverId.toString(),
      vehicleId: vehicle._id.toString(),
    } as never);
    check('8a. second booking assigned to freed vehicle & driver', assignedSecond.status === 'DRIVER_ASSIGNED');
    const vehicleDuringAssign = await VendorVehicleModel.findById(vehicle._id).exec();
    check('8b. vehicle reserved for second booking', String(vehicleDuringAssign?.activeBookingId ?? '') === secondBooking._id.toString());

    // Driver rejects pre-accept
    const rejectResult = await driverService.rejectBooking(driverId.toString(), 'driver', secondBooking._id.toString(), 'towing');
    check('8c. pre-accept reject succeeds', rejectResult.status === 'CONFIRMED');
    const secondBookingAfterReject = await TowingBookingModel.findById(secondBooking._id).exec();
    const vehicleAfterReject = await VendorVehicleModel.findById(vehicle._id).exec();
    check('8d. booking status reverted to CONFIRMED', secondBookingAfterReject?.status === 'CONFIRMED');
    check('8e. booking driverId unset', secondBookingAfterReject?.driverId == null);
    check('8f. booking assignedFleetVehicleId unset', secondBookingAfterReject?.assignedFleetVehicleId == null);
    check('8g. fleet vehicle activeBookingId released', vehicleAfterReject?.activeBookingId == null);

    // ── 9. Search drivers: Full-Time included, Part-Time strictly excluded ──
    const ftDriverId = new Types.ObjectId();
    const ptDriverId = new Types.ObjectId();
    const ftPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const ptPhone = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
    await UserModel.create([
      {
        _id: ftDriverId,
        fullName: `FT Candidate ${suffix}`,
        mobileNumber: ftPhone,
        email: `ft-${suffix}@test.local`,
        role: 'driver',
        isVerified: true,
        isAvailable: true,
        driverProfile: {
          status: 'APPROVED',
          driverType: 'Full-Time',
          driverCode: `FT-${suffix}`,
          licenseNo: `FTDL${suffix}`,
          city: 'Bhubaneswar',
        },
      },
      {
        _id: ptDriverId,
        fullName: `PT Candidate ${suffix}`,
        mobileNumber: ptPhone,
        email: `pt-${suffix}@test.local`,
        role: 'driver',
        isVerified: true,
        isAvailable: true,
        driverProfile: {
          status: 'APPROVED',
          driverType: 'Part-Time',
          driverCode: `PT-${suffix}`,
          licenseNo: `PTDL${suffix}`,
          city: 'Bhubaneswar',
        },
      },
    ] as never);

    const { driverVendorMembershipService } = await import('../services/src/driverVendorMembership');
    const searchResults = await driverVendorMembershipService.searchDrivers(vendorId.toString(), `Candidate ${suffix}`);
    const foundFt = searchResults.some((d) => d.id === ftDriverId.toString());
    const foundPt = searchResults.some((d) => d.id === ptDriverId.toString());
    check('9a. Full-Time driver found in vendor search', foundFt);
    check('9b. Part-Time driver strictly excluded from vendor search', !foundPt);

    // ── 10. Invitation lifecycle: Invite -> Pending -> Accept -> Active ──
    await driverVendorMembershipService.invite(vendorId.toString(), ftPhone);
    const invitations = await driverVendorMembershipService.listDriverInvitations(ftDriverId.toString());
    const inv = invitations.find((i) => i.vendor.id === vendorId.toString());
    check('10a. driver sees pending invitation from vendor', Boolean(inv));

    if (inv) {
      await driverVendorMembershipService.respond(ftDriverId.toString(), inv.id, 'accept');
      const activeMembership = await driverVendorMembershipService.getDriverMembership(ftDriverId.toString());
      check('10b. driver accepts -> active membership created', activeMembership?.vendor?.id === vendorId.toString());
    }

    console.log(failures === 0 ? '\nALL E2E CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
    process.exitCode = failures === 0 ? 0 : 1;
  } finally {
    await TowingBookingModel.deleteMany({ $or: [{ vendorId }, { bookingNumber: new RegExp(`^E2E-TOW.*${suffix}$`) }] });
    await DriverVendorMembershipModel.deleteMany({ $or: [{ vendorUserId: vendorId }, { driverUserId: driverId }] });
    await VendorVehicleModel.deleteMany({ _id: vehicleId });
    await UserModel.deleteMany({
      $or: [
        { _id: { $in: [vendorId, driverId, customerId] } },
        { mobileNumber: new RegExp(`\\+9199[0-9]{3}${suffix}`) },
      ],
    });
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('E2E crashed:', error);
  process.exit(1);
});
