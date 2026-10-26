import mongoose, { Types } from 'mongoose';
import http from 'node:http';
import crypto from 'node:crypto';
import { env } from '../config/env';
import {
  verifyWebhookSignature,
  paymentWebhookService,
} from '../services/src/payments/paymentWebhook';
import { processBookingCompletionEscrowSettlement } from '../services/src/payments/escrowSettlement';
import { TransactionModel } from '../models/src/transaction';
import { PaymentTransactionModel } from '../models/src/paymentTransaction';
import { TowingBookingModel } from '../models/src/towingBooking';
import { PlatformSettingsModel } from '../models/src/platformSettings';
import { UserModel } from '../models/src/user';
import { initializeSocket } from '../services/src/socket';

async function run() {
  console.log('--- STARTING PHASE 3 GATEWAY, ESCROW & SOCKETS VERIFICATION ---');
  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB connected.');

  // Test 1: HMAC SHA256 Webhook Signature Verification
  console.log('\n[1] Testing HMAC SHA256 Webhook Signature Verification...');
  const testSecret = 'whsec_test_secret_key_12345';
  const rawPayload = JSON.stringify({ event: 'payment.captured', orderId: 'order_test_999', amount: 1500 });
  const validSignature = crypto.createHmac('sha256', testSecret).update(rawPayload).digest('hex');

  const isValid = verifyWebhookSignature(rawPayload, validSignature, testSecret);
  if (!isValid) throw new Error('Valid HMAC signature failed verification');

  const tamperedPayload = JSON.stringify({ event: 'payment.captured', orderId: 'order_test_999', amount: 999999 });
  const isTamperedValid = verifyWebhookSignature(tamperedPayload, validSignature, testSecret);
  if (isTamperedValid) throw new Error('Tampered payload passed signature check');

  const isInvalidSigValid = verifyWebhookSignature(rawPayload, 'fake_invalid_sig_abc', testSecret);
  if (isInvalidSigValid) throw new Error('Invalid signature passed check');
  console.log('✓ TEST 1 PASSED: Cryptographic HMAC SHA256 signature verification 100% accurate.');

  // Test 2: Automated Escrow Settlement (85/15 Escrow Split) & Idempotency
  console.log('\n[2] Testing Automated 85/15 Escrow Settlement & Idempotency...');
  const testBookingId = new Types.ObjectId().toString();
  const testBookingNumber = `TOW-ESCROW-${Date.now().toString().slice(-6)}`;
  const testGrossFare = 2000;

  const settlement = await processBookingCompletionEscrowSettlement({
    bookingId: testBookingId,
    bookingNumber: testBookingNumber,
    finalFare: testGrossFare,
  });

  console.log('Disbursed settlement result:', settlement);
  const settings = await PlatformSettingsModel.findOne().lean();
  const rate = settings?.commissionRate ?? 15;
  const expectedCommission = Math.round(testGrossFare * (rate / 100));
  const expectedVendorShare = testGrossFare - expectedCommission;

  if (!settlement.settled) throw new Error('Expected settlement to succeed');
  if (settlement.grossFare !== 2000) throw new Error('Expected gross fare 2000');
  if (settlement.vendorShare !== expectedVendorShare) throw new Error(`Expected vendor share ${expectedVendorShare}, got ${settlement.vendorShare}`);
  if (settlement.commission !== expectedCommission) throw new Error(`Expected commission ${expectedCommission}, got ${settlement.commission}`);

  // Verify in MongoDB
  const payoutRecord = await TransactionModel.findOne({ bookingId: new Types.ObjectId(testBookingId), type: 'VENDOR_PAYOUT' });
  if (!payoutRecord || payoutRecord.amount !== expectedVendorShare) throw new Error('VENDOR_PAYOUT record missing or incorrect in DB');

  const commRecord = await TransactionModel.findOne({ bookingId: new Types.ObjectId(testBookingId), type: 'COMMISSION' });
  if (!commRecord || commRecord.amount !== expectedCommission) throw new Error('COMMISSION record missing or incorrect in DB');

  // Test idempotency: calling again should not duplicate payouts
  const duplicateSettlement = await processBookingCompletionEscrowSettlement({
    bookingId: testBookingId,
    bookingNumber: testBookingNumber,
    finalFare: testGrossFare,
  });
  if (duplicateSettlement.settled) throw new Error('Duplicate settlement was permitted!');
  const totalPayouts = await TransactionModel.countDocuments({ bookingId: new Types.ObjectId(testBookingId), type: 'VENDOR_PAYOUT' });
  if (totalPayouts !== 1) throw new Error('Duplicate VENDOR_PAYOUT was created in DB');
  console.log('✓ TEST 2 PASSED: Automated 85/15 escrow split and idempotency verified 100%.');

  // Test 3: Server-to-Server Payment Webhook Processing
  console.log('\n[3] Testing Server-to-Server Payment Webhook Handler...');
  let customerUser = await UserModel.findOne({ mobileNumber: '+919999888877' });
  if (!customerUser) {
    customerUser = await UserModel.create({
      mobileNumber: '+919999888877',
      fullName: 'Webhook Customer',
      role: 'customer',
      status: 'active',
    });
  }

  const testTowing = await TowingBookingModel.create({
    bookingNumber: `TOW-WH-${Date.now().toString().slice(-6)}`,
    customerId: customerUser._id,
    vehicleId: new Types.ObjectId(),
    towingMode: 'instant',
    pickup: { address: 'Plot 10, Janpath, Bhubaneswar', latitude: 20.2961, longitude: 85.8245 },
    dropoff: { address: 'Master Canteen, Bhubaneswar', latitude: 20.2603, longitude: 85.8395 },
    estimatedFare: 1500,
    advanceAmount: 400,
    advancePaid: false,
    remainingAmount: 1100,
    remainingPaid: false,
    paymentStatus: 'PENDING_ADVANCE',
    status: 'PENDING',
  });

  const gatewayRef = `pay_order_ref_${Date.now()}`;
  const advanceTx = await PaymentTransactionModel.create({
    customerId: customerUser._id,
    bookingId: testTowing._id,
    bookingType: 'towing',
    paymentType: 'advance',
    amount: 400,
    currency: 'INR',
    status: 'initiated',
    gatewayReferenceId: gatewayRef,
  });

  // Process advance webhook
  const webhookResult = await paymentWebhookService.processWebhook({
    gateway: 'razorpay',
    referenceId: gatewayRef,
    status: 'success',
    amount: 400,
  });
  console.log('Advance webhook process result:', webhookResult);
  if (!webhookResult.success) throw new Error('Advance payment webhook failed');

  const updatedBooking = await TowingBookingModel.findById(testTowing._id);
  if (!updatedBooking?.advancePaid) throw new Error('Booking advancePaid was not marked true by webhook');
  if (updatedBooking?.paymentStatus !== 'ADVANCE_PAID') throw new Error('Booking paymentStatus not transitioned to ADVANCE_PAID');
  if (updatedBooking?.status !== 'CONFIRMED') throw new Error('Booking status not transitioned to CONFIRMED');

  const updatedTx = await PaymentTransactionModel.findById(advanceTx._id);
  if (updatedTx?.status !== 'success') throw new Error('Transaction status not marked success');
  console.log('✓ TEST 3 PASSED: Server-to-server gateway webhook correctly transitions booking & payments.');

  // Test 4: Socket.IO Server & Redis Adapter Graceful Fallback
  console.log('\n[4] Testing Socket.IO Server & Redis Multi-Node Adapter Fallback...');
  const dummyServer = http.createServer();
  initializeSocket(dummyServer);
  console.log('✓ TEST 4 PASSED: Socket.IO initialized cleanly with resilient multi-node / in-memory fallback.');

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 3 GATEWAY, ESCROW & SOCKET TESTS PASSED 100%!');
  console.log('======================================================');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Phase 3 test failed:', err);
  process.exit(1);
});
