import { Router } from 'express';
import { env } from '../../config/env';
import { connectDatabase } from '../../config/database';
import { logger } from '../../utils/src/logger';

/**
 * One-shot QA bootstrap route (user request 2026-10-27).
 *
 * POST /api/v1/qa-bootstrap/test-accounts
 *   header: x-qa-token === QA_BOOTSTRAP_TOKEN
 *
 * Runs backend/src/scripts/ensure-test-accounts.ts logic against the live
 * DB (non-destructive upsert of the 4 QA accounts). Guards:
 *   - NODE_ENV must NOT be 'production' (productionGuard alignment)
 *   - QA_BOOTSTRAP_TOKEN must be set on the service
 *   - route self-disables after success (one-shot per deploy)
 */
const router = Router();
let used = false;
let wipeUsed = false;

const QA_KEEP_MOBILES = [
  '+919000000001',
  '+919000000002',
  '+919000000003',
  '+919000000004',
];

/**
 * POST /qa-bootstrap/wipe-stale-data
 *   header: x-qa-token === QA_BOOTSTRAP_TOKEN  (one-shot per instance)
 *
 * Deletes ALL users EXCEPT the 4 QA test accounts, plus every business
 * collection (bookings, vehicles, transactions, notifications, ...).
 * Preserved: brands, services, subscriptionplans, platformsettings, admins.
 * User request 2026-10-27: dashboard par sirf QA testing data dikhna chahiye.
 */
router.post('/qa-bootstrap/wipe-stale-data', async (req, res) => {
  if (env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Disabled in production' });
  }
  const token = process.env.QA_BOOTSTRAP_TOKEN;
  if (!token || req.headers['x-qa-token'] !== token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (wipeUsed) {
    return res.status(409).json({ success: false, message: 'Already run on this instance' });
  }
  wipeUsed = true;
  try {
    await connectDatabase();
    const { UserModel } = await import('../../models/src/user');
    const { VendorVehicleModel } = await import('../../models/src/vendorVehicle');
    const { DriverVendorMembershipModel } = await import('../../models/src/driverVendorMembership');

    // 1. Delete every user that is NOT one of the 4 QA accounts.
    const staleUsers = await UserModel.deleteMany({ mobileNumber: { $nin: QA_KEEP_MOBILES } });
    // 2. QA fleet trucks re-point to the surviving vendor; drop others.
    const qaVendor = await UserModel.findOne({ mobileNumber: QA_KEEP_MOBILES[0] });
    if (qaVendor) {
      await VendorVehicleModel.deleteMany({
        vendorId: { $ne: qaVendor._id },
        $or: [
          { registrationNo: { $nin: ['QA01TR0001', 'QA01TR0002'] } },
          { vendorId: { $nin: [qaVendor._id] } },
        ],
      });
    }
    // 3. Memberships: drop all, recreate the single QA link below.
    await DriverVendorMembershipModel.deleteMany({});

    // 4. Wipe business collections wholesale (raw collection names).
    const db = UserModel.db;
    const wipeAll = [
      'vehicles', 'vehicleqrcodes', 'towingbookings', 'driverbookings', 'bookings',
      'transactions', 'driverenquiries', 'vendordocuments', 'adminnotifications',
      'paymenttransactions', 'savedlocations', 'notifications', 'wallets',
      'paymentmethods', 'activitylogs', 'usersubscriptions', 'otplogs', 'enquiries',
    ];
    const wiped: Record<string, number> = {};
    for (const name of wipeAll) {
      try {
        const r = await db.collection(name).deleteMany({});
        wiped[name] = r.deletedCount;
      } catch {
        wiped[name] = -1;
      }
    }

    // 5. Recreate the QA vendor fleet + membership (accounts survive).
    const { upsertQaAccounts } = await import('../../services/src/qaAccounts');
    const ensured = await upsertQaAccounts();
    logger.info('QA wipe-stale-data complete', { staleUsers: staleUsers.deletedCount });
    return res.json({
      success: true,
      deletedStaleUsers: staleUsers.deletedCount,
      wipedCollections: wiped,
      qaAccountsEnsured: ensured,
      message: 'Stale data removed — only the 4 QA test accounts remain',
    });
  } catch (error) {
    wipeUsed = false;
    logger.error('QA wipe failed', { error: (error as Error).message });
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});


router.post('/qa-bootstrap/test-accounts', async (req, res) => {
  if (env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Disabled in production' });
  }
  const token = process.env.QA_BOOTSTRAP_TOKEN;
  if (!token || req.headers['x-qa-token'] !== token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (used) {
    return res.status(409).json({ success: false, message: 'Already run on this instance' });
  }
  used = true;
  try {
    const { UserModel } = await import('../../models/src/user');
    const { VendorVehicleModel } = await import('../../models/src/vendorVehicle');
    const { DriverVendorMembershipModel } = await import('../../models/src/driverVendorMembership');
    const { hashDriverPassword } = await import('../../utils/src/driverPassword');
    const { subscriptionService } = await import('../../services/src/subscription');

    await connectDatabase();
    const upsert = (mobileNumber: string, doc: Record<string, unknown>) =>
      UserModel.findOneAndUpdate({ mobileNumber }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });

    const vendor = await upsert('+919000000001', {
      mobileNumber: '+919000000001', fullName: 'Test Vendor Singh', role: 'vendor', capabilities: ['vendor'],
      isVerified: true, isProfileCompleted: true, accountStatus: 'ACTIVE', registrationStatus: 'SUBMITTED',
      reviewStatus: 'VERIFIED', operationalStatus: 'ENABLED', isAvailable: false,
      vendorProfile: {
        vendorType: 'towing_company', status: 'approved', verificationStage: 'approved',
        businessName: 'QA Towing Services', ownerName: 'Test Vendor Singh',
        address: 'Plot 12, Industrial Estate, Bhubaneswar, Odisha 751007',
      },
    });

    const qaTrucks = await VendorVehicleModel.countDocuments({
      vendorId: vendor!._id, registrationNo: { $in: ['QA01TR0001', 'QA01TR0002'] },
    });
    if (qaTrucks < 2) {
      await VendorVehicleModel.deleteMany({ vendorId: vendor!._id, registrationNo: { $in: ['QA01TR0001', 'QA01TR0002'] } });
      await VendorVehicleModel.create([
        { vendorId: vendor!._id, registrationNo: 'QA01TR0001', type: 'flatbed_tow_truck', vehicleModel: 'Tata LPT 710 Flatbed', year: 2023, status: 'ACTIVE' },
        { vendorId: vendor!._id, registrationNo: 'QA01TR0002', type: 'integrated_tow_truck', vehicleModel: 'Ashok Leyland Boss Integrated', year: 2024, status: 'ACTIVE' },
      ]);
    }

    await upsert('+919000000002', {
      mobileNumber: '+919000000002', fullName: 'Test Driver FullTime', role: 'driver', capabilities: ['driver'],
      isVerified: true, isProfileCompleted: true, accountStatus: 'ACTIVE', registrationStatus: 'SUBMITTED',
      reviewStatus: 'VERIFIED', operationalStatus: 'ENABLED', isAvailable: false,
      selfDriverCategory: 'FULL_TIME', driverContext: 'INDEPENDENT',
      driverProfile: {
        driverCode: 'QA-DR-FT-001', licenseNo: 'QADLFT2026001', driverType: 'Full-Time',
        city: 'Bhubaneswar', state: 'Odisha', vehicleRegistration: 'QA01DV0001', status: 'APPROVED',
        rating: 4.8, reviewCount: 24, experienceYears: 5, languages: ['Hindi', 'English', 'Odia'],
        policeVerificationStatus: 'VERIFIED',
        statusHistory: [{ status: 'APPROVED', note: 'QA bootstrap', changedAt: new Date() }],
      },
    });

    await upsert('+919000000003', {
      mobileNumber: '+919000000003', fullName: 'Test Driver PartTime', role: 'driver', capabilities: ['driver'],
      isVerified: true, isProfileCompleted: true, accountStatus: 'ACTIVE', registrationStatus: 'SUBMITTED',
      reviewStatus: 'VERIFIED', operationalStatus: 'ENABLED', isAvailable: false,
      selfDriverCategory: 'PART_TIME', driverContext: 'INDEPENDENT',
      driverProfile: {
        driverCode: 'QA-DR-PT-002', licenseNo: 'QADLPT2026002', driverType: 'Part-Time',
        city: 'Bhubaneswar', state: 'Odisha', availabilityWindow: 'evenings_weekends', status: 'APPROVED',
        rating: 4.5, reviewCount: 11, experienceYears: 2, languages: ['Hindi', 'Odia'],
        policeVerificationStatus: 'VERIFIED',
        statusHistory: [{ status: 'APPROVED', note: 'QA bootstrap', changedAt: new Date() }],
      },
    });

    const vd = await upsert('+919000000004', {
      mobileNumber: '+919000000004', fullName: 'Test Driver VendorFleet', role: 'driver', capabilities: ['driver'],
      isVerified: true, isProfileCompleted: true, accountStatus: 'ACTIVE', registrationStatus: 'SUBMITTED',
      reviewStatus: 'VERIFIED', operationalStatus: 'ENABLED', isAvailable: false,
      driverContext: 'VENDOR_MANAGED', vendorUserId: vendor!._id,
      driverProfile: {
        driverCode: 'QA-DR-VF-003', licenseNo: 'QADLVF2026003', vendorUserId: vendor!._id,
        fleetSource: 'vendor', loginId: 'qa.driver.vf', passwordHash: await hashDriverPassword('Test@123'),
        driverType: 'Tow Driver', city: 'Bhubaneswar', state: 'Odisha', vehicleRegistration: 'QA01TR0001',
        status: 'APPROVED', rating: 4.9, reviewCount: 37, experienceYears: 7, languages: ['Hindi', 'English'],
        policeVerificationStatus: 'VERIFIED',
        statusHistory: [{ status: 'APPROVED', note: 'QA bootstrap', changedAt: new Date() }],
      },
    });

    const membership = await DriverVendorMembershipModel.findOne({ driverUserId: vd!._id, status: 'ACTIVE' });
    if (!membership) {
      await DriverVendorMembershipModel.create({
        vendorUserId: vendor!._id, driverUserId: vd!._id, status: 'ACTIVE',
        invitedBy: vendor!._id, invitedAt: new Date(), decidedBy: vendor!._id, decidedAt: new Date(),
        driverLockKey: `driver:${vd!._id}`,
      });
    }

    await subscriptionService.ensurePlansSeeded();

    logger.info('QA bootstrap: test accounts ensured');
    return res.json({
      success: true,
      message: 'QA test accounts ensured (non-destructive)',
      accounts: ['9000000001 vendor', '9000000002 driver-FT', '9000000003 driver-PT', '9000000004 driver-VM'],
    });
  } catch (error) {
    used = false;
    logger.error('QA bootstrap failed', { error: (error as Error).message });
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
