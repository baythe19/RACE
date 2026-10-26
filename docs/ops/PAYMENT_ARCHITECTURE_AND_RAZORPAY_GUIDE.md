# RACE — Payment Architecture & Future Razorpay Integration Guide

> **Target Audience:** Engineering, DevOps, Product Managers, Operations.  
> **Status:** Active in Production (UPI & Cash Priority Mode). Razorpay architecture documented for future activation.

---

## 1. Executive Summary & Production Modes

RACE Roadside Assistance operates on an immediate-dispatch model where service completion and trust are prioritized. For the current production phase, payment collection is optimized for speed, reliability, and zero merchant-discount-rate (MDR) overhead.

### Active Production Modes:
1. **Priority #1: UPI / Dynamic QR Code (Recommended)**
   - Customers scan a dynamic UPI QR code or enter a VPA (`race@icici` / driver VPA).
   - Zero transaction fees, 100% immediate settlement to business account.
   - Customer taps "I Have Paid" -> Driver receives instant real-time notification on screen and lock screen.
2. **Priority #2: Cash to Driver**
   - Customer pays driver directly upon arrival at destination before car unwinch/dropoff.
   - Ideal for low-connectivity highway zones or cash-preferring customers.
   - Both driver and customer must verify payment before completion OTP is released.

---

## 2. Dropoff Payment & Completion OTP Verification Protocol

To prevent unpaid vehicle handoffs and ensure financial reconciliation:

```
[Driver Marks: Arrived at Dropoff]
             │
             ▼
[Dropoff Payment Modal Pops Up on Customer App]
             │
             ├──► Customer selects UPI (Priority #1) or Cash (Priority #2)
             │
             ▼
[Customer Confirms Payment] ───(Socket: booking:payment_confirmed)───► [Driver Device Alerts: "Payment Received!"]
             │
             ▼
[Customer App Displays 4-Digit Completion OTP]
             │
             ▼
[Driver Enters 4-Digit Completion OTP]
             │
             ▼
[Backend Validates OTP + Sets Booking Status to COMPLETED]
```

- **Security Rule:** The completion OTP is never emitted to the driver over sockets or in API payloads. It is strictly displayed to the paying customer on their phone screen.
- **Guard Clause:** The backend endpoint `verifyCompletionOtp` rejects verification attempts if `paymentConfirmedByCustomer` is false or dropoff arrival timestamp is null.

---

## 3. Future Razorpay Integration: Architecture Blueprint

When business volume scales to card payments, corporate fleet net-banking, and EMI financing, Razorpay will be plugged in seamlessly without redesigning existing workflows.

### 3.1 Architecture Overview

```
Customer Mobile App             Backend API                Razorpay Gateway
        │                            │                             │
        │── 1. Create Payment Order ─►│                             │
        │      (POST /payments/order)│                             │
        │                            │── 2. razorpay.orders.create ─►│
        │                            │◄─ 3. Return order_id ─────────│
        │◄─ 4. Return order details ─│                             │
        │                            │                             │
        │── 5. Launch Razorpay UI ────────────────────────────────►│
        │   (Checkout SDK / UPI intent)                            │
        │                            │                             │
        │◄─ 6. Payment Success (signature, payment_id) ────────────│
        │                            │                             │
        │── 7. Verify Signature ────►│                             │
        │      (POST /payments/verify)                             │
        │                            │── 8. Verify HMAC-SHA256     │
        │                            │                             │
        │                            │◄── Webhook: order.paid ─────│
        │                            │    (Asynchronous guarantee) │
```

---

## 4. Step-by-Step Future Implementation Guide

### Step 1: Install Razorpay Node SDK in `backend/`
```bash
cd backend
npm install razorpay
npm install --save-dev @types/razorpay
```

### Step 2: Environment Variables (`backend/.env`)
```ini
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
PAYMENT_GATEWAY_ENABLED=true
```

### Step 3: Backend Order Creation Service (`backend/src/services/src/razorpay.ts`)
```ts
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../config/env';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function createRazorpayOrder(bookingId: string, amountInRupees: number) {
  const order = await razorpay.orders.create({
    amount: Math.round(amountInRupees * 100), // in paise
    currency: 'INR',
    receipt: `rcpt_${bookingId.slice(-8)}`,
    notes: { bookingId },
  });
  return order;
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return generatedSignature === signature;
}

export function verifyWebhookSignature(body: string, webhookSignature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
    .update(body)
    .digest('hex');
  return expectedSignature === webhookSignature;
}
```

### Step 4: Webhook Handler (`POST /api/v1/payments/razorpay-webhook`)
Webhooks provide an asynchronous guarantee in case the customer closes the mobile app right after entering their UPI PIN:
```ts
router.post('/razorpay-webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body.event;
  if (event === 'order.paid' || event === 'payment.captured') {
    const bookingId = req.body.payload.payment.entity.notes.bookingId;
    await confirmPaymentFromWebhook(bookingId, req.body.payload.payment.entity.id);
  }

  return res.status(200).json({ received: true });
});
```

---

## 5. Refunds & Cancellation Workflows

When a customer or admin cancels a booking eligible for refund:
1. **Advance Paid via Cash/UPI:** Refund processed directly by accounts via IMPS/NEFT with reference number entered in admin portal.
2. **Advance Paid via Future Razorpay:** Refund initiated automatically via Razorpay Refund API:
   ```ts
   await razorpay.payments.refund(paymentId, {
     amount: refundAmountInPaise,
     speed: 'optimum', // Instant refund to original source account
   });
   ```

---

## 6. Summary of Payment Configurations

| Mode | Active Status | Processing Fee (MDR) | Settlement Speed | Best For |
|:---|:---|:---|:---|:---|
| **UPI / QR** | **Active (Priority #1)** | 0% | Instant | All regular consumer bookings |
| **Cash to Driver** | **Active (Priority #2)** | 0% | Immediate in-hand | Highway emergency zones |
| **Razorpay Gateway** | **Documented for future** | 1.8% - 2.5% | T+1 business day | Corporate fleet cards & net-banking |
