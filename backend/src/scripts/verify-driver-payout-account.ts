import mongoose from 'mongoose';
import { vendorService } from '../services/src/vendor';
import { UserModel } from '../models/src/user';
import { env } from '../config/env';

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const testMobile = '+919999900011';
  let driverUser = await UserModel.findOne({ mobileNumber: testMobile });
  if (!driverUser) {
    driverUser = await UserModel.create({
      mobileNumber: testMobile,
      fullName: 'Test Driver Partner',
      role: 'driver',
      status: 'active',
      driverProfile: {
        driverType: 'full_time',
        licenseNo: 'MH0120230009999',
        driverCode: 'DRV-9999',
        city: 'Mumbai',
        rating: 5,
        reviewCount: 1,
        status: 'APPROVED',
        totalTrips: 10,
        documents: [],
        statusHistory: [],
      },
    });
  } else {
    driverUser.role = 'driver';
    await driverUser.save();
  }

  const driverId = driverUser._id.toString();
  console.log(`Driver user ID: ${driverId}`);

  // Test 1: Save bank payout account
  console.log('\n--- Test 1: Save Bank Payout Account for Driver ---');
  const bankResult = await vendorService.savePayoutAccount(driverId, {
    accountHolderName: 'Driver Account Holder',
    payoutMethod: 'bank',
    bank: {
      accountNumber: '987654321098',
      ifsc: 'SBIN0001234',
      bankName: 'State Bank of India',
    },
  });
  console.log('Saved bank payout account:', bankResult);

  if (bankResult.payoutMethod !== 'bank') throw new Error('Expected payoutMethod to be bank');
  if (bankResult.bankName !== 'State Bank of India') throw new Error('Expected bankName to match');
  if (!bankResult.accountNumberMasked?.endsWith('1098')) throw new Error('Expected masked account number ending in 1098');

  // Verify DB state
  const updatedDriver = await UserModel.findById(driverId);
  if (!updatedDriver?.driverProfile?.bankDetails) {
    throw new Error('Driver profile bankDetails was not saved in DB!');
  }
  if (updatedDriver.driverProfile.bankDetails.accountNumber !== '987654321098') {
    throw new Error('Driver profile bankDetails accountNumber does not match!');
  }
  if (updatedDriver.driverProfile.bankDetails.source !== 'driver_app') {
    throw new Error(`Expected source to be driver_app, got ${updatedDriver.driverProfile.bankDetails.source}`);
  }
  console.log('✅ Driver bank account saved in driverProfile.bankDetails successfully!');

  // Test 2: Get payout account
  console.log('\n--- Test 2: Get Payout Account for Driver ---');
  const retrieved = await vendorService.getPayoutAccount(driverId);
  console.log('Retrieved payout account:', retrieved);
  if (retrieved.accountHolderName !== 'Driver Account Holder') {
    throw new Error('Account holder name mismatch on retrieve');
  }
  console.log('✅ Driver payout account retrieved successfully!');

  // Test 3: Save UPI payout account
  console.log('\n--- Test 3: Save UPI Payout Account for Driver ---');
  const upiResult = await vendorService.savePayoutAccount(driverId, {
    accountHolderName: 'Driver UPI Holder',
    payoutMethod: 'upi',
    upi: {
      upiId: 'testdriver@oksbi',
    },
  });
  console.log('Saved UPI payout account:', upiResult);
  if (upiResult.payoutMethod !== 'upi' || upiResult.upiId !== 'testdriver@oksbi') {
    throw new Error('UPI payout account save failed');
  }

  const updatedDriverUpi = await UserModel.findById(driverId);
  if (updatedDriverUpi?.driverProfile?.bankDetails?.upiId !== 'testdriver@oksbi') {
    throw new Error('UPI ID not saved in driverProfile.bankDetails');
  }
  console.log('✅ Driver UPI account saved and retrieved successfully!');

  // Test 4: Verify vendor role isolation
  console.log('\n--- Test 4: Vendor Role Persistence Isolation ---');
  const testVendorMobile = '+919999900022';
  let vendorUser = await UserModel.findOne({ mobileNumber: testVendorMobile });
  if (!vendorUser) {
    vendorUser = await UserModel.create({
      mobileNumber: testVendorMobile,
      fullName: 'Test Vendor Partner',
      role: 'vendor',
      status: 'active',
      vendorProfile: {
        vendorType: 'towing_company',
        status: 'approved',
        verificationStage: 'approved',
      },
    });
  } else {
    vendorUser.role = 'vendor';
    await vendorUser.save();
  }
  const vendorId = vendorUser._id.toString();

  await vendorService.savePayoutAccount(vendorId, {
    accountHolderName: 'Vendor Firm',
    payoutMethod: 'bank',
    bank: {
      accountNumber: '112233445566',
      ifsc: 'HDFC0000001',
      bankName: 'HDFC Bank',
    },
  });

  const updatedVendor = await UserModel.findById(vendorId);
  if (updatedVendor?.vendorProfile?.bankDetails?.accountNumber !== '112233445566') {
    throw new Error('Vendor bank details not saved in vendorProfile!');
  }
  if (updatedVendor?.driverProfile?.bankDetails) {
    throw new Error('Vendor should not have driverProfile.bankDetails!');
  }
  console.log('✅ Vendor bank details saved strictly in vendorProfile.bankDetails!');

  console.log('\n========================================');
  console.log('🎉 ALL DRIVER & VENDOR PAYOUT TESTS PASSED 100%!');
  console.log('========================================');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
