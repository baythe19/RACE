import mongoose from 'mongoose';

const API_BASE = 'http://127.0.0.1:3000/api/v1';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  data?: unknown;
  error?: string;
  notes?: string;
}

const results: TestResult[] = [];

function record(suite: string, test: string, passed: boolean, data?: unknown, error?: string, notes?: string) {
  results.push({ suite, test, passed, data, error, notes });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${suite}] ${test}${error ? ` -> ERROR: ${error}` : ''}${notes ? ` (${notes})` : ''}`);
}

async function request(path: string, options: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function run() {
  console.log('====================================================');
  console.log('🔍 RACE SYSTEM COMPREHENSIVE AUDIT & VERIFICATION');
  console.log('====================================================\n');

  // ----------------------------------------------------------------
  // 1. DATABASE AUDIT (MongoDB)
  // ----------------------------------------------------------------
  console.log('\n--- 1. DATABASE AUDIT (MongoDB) ---');
  let collectionsMap: Record<string, number> = {};
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/race');
    const collections = await mongoose.connection.db!.listCollections().toArray();

    for (const c of collections) {
      const count = await mongoose.connection.db!.collection(c.name).countDocuments();
      collectionsMap[c.name] = count;
    }

    record('Database', 'Connection to race MongoDB', true);
    record('Database', 'Collections audit', true, collectionsMap);
    await mongoose.disconnect();
  } catch (err: any) {
    record('Database', 'Connection to race MongoDB', false, null, err.message);
  }

  // ----------------------------------------------------------------
  // 2. ADMIN API & AUTH
  // ----------------------------------------------------------------
  console.log('\n--- 2. ADMIN API & AUTH AUDIT ---');
  let adminToken = '';
  try {
    const loginRes = await request('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin@raceservice.com', password: 'Admin@123' }),
    });

    if (loginRes.ok && loginRes.data?.data?.tokens?.accessToken) {
      adminToken = loginRes.data.data.tokens.accessToken;
      record('Admin', 'Admin Login (admin@raceservice.com)', true, {
        role: loginRes.data.data.user.role,
        permissionsCount: loginRes.data.data.user.permissions?.length,
      });
    } else {
      record('Admin', 'Admin Login', false, loginRes.data, loginRes.data?.message || 'Login failed');
    }
  } catch (err: any) {
    record('Admin', 'Admin Login', false, null, err.message);
  }

  if (adminToken) {
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Dashboard Overview
    const dashRes = await request('/admin/dashboard', { headers: adminHeaders });
    record('Admin', 'GET /admin/dashboard (Metrics, Charts, Activities)', dashRes.ok, {
      hasKpis: Boolean(dashRes.data?.data?.stats),
      hasCharts: Boolean(dashRes.data?.data?.charts),
    });

    // Customers List
    const custRes = await request('/admin/customers', { headers: adminHeaders });
    const custs = custRes.data?.data?.customers ?? custRes.data?.data ?? [];
    record('Admin', 'GET /admin/customers', custRes.ok, { count: custs.length });

    // Vendors List
    const vendRes = await request('/admin/vendors', { headers: adminHeaders });
    const vends = vendRes.data?.data?.vendors ?? vendRes.data?.data ?? [];
    record('Admin', 'GET /admin/vendors', vendRes.ok, { count: vends.length });

    // Drivers List
    const drvRes = await request('/admin/drivers', { headers: adminHeaders });
    const drvs = drvRes.data?.data?.drivers ?? drvRes.data?.data ?? [];
    record('Admin', 'GET /admin/drivers', drvRes.ok, { count: drvs.length });

    // Available Drivers
    const availDrvRes = await request('/admin/drivers/available', { headers: adminHeaders });
    record('Admin', 'GET /admin/drivers/available', availDrvRes.ok, { count: availDrvRes.data?.data?.length });

    // Bookings List
    const bkgRes = await request('/admin/bookings', { headers: adminHeaders });
    const bkgs = bkgRes.data?.data?.bookings ?? bkgRes.data?.data ?? [];
    record('Admin', 'GET /admin/bookings', bkgRes.ok, { count: bkgs.length });

    // Finance Transactions
    const finRes = await request('/admin/transactions', { headers: adminHeaders });
    record('Admin', 'GET /admin/transactions', finRes.ok, {
      count: finRes.data?.data?.transactions?.length ?? finRes.data?.data?.length,
    });

    // Finance Summary
    const finSum = await request('/admin/transactions/summary', { headers: adminHeaders });
    record('Admin', 'GET /admin/transactions/summary', finSum.ok, finSum.data?.data);

    // Settings
    const setRes = await request('/admin/settings', { headers: adminHeaders });
    record('Admin', 'GET /admin/settings', setRes.ok, setRes.data?.data);

    // Subscriptions Overview
    const subOverRes = await request('/admin/subscriptions/overview', { headers: adminHeaders });
    record('Admin', 'GET /admin/subscriptions/overview', subOverRes.ok, subOverRes.data?.data);

    // Subscriptions Plans
    const subPlansRes = await request('/admin/subscriptions/plans', { headers: adminHeaders });
    record('Admin', 'GET /admin/subscriptions/plans', subPlansRes.ok, { count: subPlansRes.data?.data?.length });
  }

  // ----------------------------------------------------------------
  // 3. CUSTOMER APPLICATION API FLOWS
  // ----------------------------------------------------------------
  console.log('\n--- 3. CUSTOMER APP API FLOW AUDIT ---');
  let customerToken = '';
  let customerUser: any = null;
  const testPhone = '9876543299';

  // Send OTP
  const sendOtpRes = await request('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber: testPhone, role: 'customer' }),
  });
  const devOtp = sendOtpRes.data?.data?.devOtp;
  record('Customer', 'POST /auth/send-otp (customer)', sendOtpRes.ok, { devOtp, message: sendOtpRes.data?.data?.message });

  if (devOtp) {
    // Verify OTP
    const verifyRes = await request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber: testPhone, otp: devOtp, role: 'customer' }),
    });

    if (verifyRes.ok && verifyRes.data?.data?.accessToken) {
      customerToken = verifyRes.data.data.accessToken;
      customerUser = verifyRes.data.data.user;
      record('Customer', 'POST /auth/verify-otp', true, {
        userId: customerUser.id,
        isProfileCompleted: customerUser.isProfileCompleted,
      });
    } else {
      record('Customer', 'POST /auth/verify-otp', false, verifyRes.data, verifyRes.data?.message);
    }
  }

  let vehicleId = '';
  let towBookingId = '';
  let drvBookingId = '';
  let roadsideBookingId = '';

  if (customerToken) {
    const custHeaders = { Authorization: `Bearer ${customerToken}` };

    // Profile Complete
    const profileRes = await request('/profile/complete', {
      method: 'PUT',
      headers: custHeaders,
      body: JSON.stringify({
        fullName: 'Audit Customer',
        email: 'audit.customer@raceservice.com',
        gender: 'male',
        dateOfBirth: '1995-05-15',
        address: {
          line1: '123 Test Street', pincode: '751001',
          city: 'Bhubaneswar',
          state: 'Odisha',
          postalCode: '751001',
        },
        emergencyContact: {
          name: 'Emergency Contact',
          mobileNumber: '+919999999999',
          relationship: 'Family',
        },
      }),
    });
    record('Customer', 'PUT /profile/complete', profileRes.ok, { isProfileCompleted: profileRes.data?.data?.isProfileCompleted }, profileRes.data?.message);

    // Vehicle Registration & QR Code Generation
    const vehicleRes = await request('/vehicles', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        vehicleNumber: 'OD-02-TEST-9999',
        vehicleType: 'car',
        brand: 'Hyundai',
        model: 'Creta',
        fuelType: 'diesel',
        year: 2023,
      }),
    });
    vehicleId = vehicleRes.data?.data?.id ?? vehicleRes.data?.data?._id;
    const qrCode = vehicleRes.data?.data?.qrCode;
    const qrImage = vehicleRes.data?.data?.qrCodeImageUrl;
    record('Customer', 'POST /vehicles (Register Vehicle + QR Code)', vehicleRes.ok, {
      vehicleId,
      qrCode,
      hasQrImage: Boolean(qrImage),
    }, vehicleRes.data?.message);

    // List Vehicles
    const listVehRes = await request('/vehicles', { headers: custHeaders });
    record('Customer', 'GET /vehicles', listVehRes.ok, { count: listVehRes.data?.data?.length });

    // Brand Config
    const brandRes = await request('/brand');
    record('Customer', 'GET /brand', brandRes.ok, { appName: brandRes.data?.data?.appName });

    // Services Catalog
    const srvRes = await request('/services');
    record('Customer', 'GET /services', srvRes.ok, { categoriesCount: srvRes.data?.data?.length });

    // Towing Fare Calculation
    const fareRes = await request('/fare/towing?pickup_lat=20.2961&pickup_lng=85.8245&dropoff_lat=20.3588&dropoff_lng=85.8333');
    record('Customer', 'GET /fare/towing', fareRes.ok, fareRes.data?.data, fareRes.data?.message);

    // Towing Booking Creation
    if (vehicleId) {
      const towBkgRes = await request('/bookings/towing', {
        method: 'POST',
        headers: custHeaders,
        body: JSON.stringify({
          vehicleId,
          pickup: {
            address: 'Master Canteen, Bhubaneswar',
            latitude: 20.2644,
            longitude: 85.8433,
          },
          dropoff: {
            address: 'Patia, Bhubaneswar',
            latitude: 20.3588,
            longitude: 85.8333,
          },
        }),
      });
      towBookingId = towBkgRes.data?.data?.id ?? towBkgRes.data?.data?._id;
      record('Customer', 'POST /bookings/towing (Create Towing Booking)', towBkgRes.ok, {
        bookingId: towBookingId,
        status: towBkgRes.data?.data?.status,
        advanceAmount: towBkgRes.data?.data?.advanceAmount,
      }, towBkgRes.data?.message);

      // Towing Booking Detail & Tracking
      if (towBookingId) {
        const towDetail = await request(`/bookings/towing/${towBookingId}`, { headers: custHeaders });
        record('Customer', `GET /bookings/towing/:id`, towDetail.ok, { status: towDetail.data?.data?.status });

        const towTrack = await request(`/bookings/towing/${towBookingId}/tracking`, { headers: custHeaders });
        record('Customer', `GET /bookings/towing/:id/tracking`, towTrack.ok, towTrack.data?.data);
      }

      // Driver Booking Creation
      const drvBkgRes = await request('/bookings/driver', {
        method: 'POST',
        headers: custHeaders,
        body: JSON.stringify({
          vehicleId,
          pickup: {
            address: 'Khandagiri, Bhubaneswar',
            latitude: 20.2587,
            longitude: 85.7865,
          },
          packageHours: 4,
        }),
      });
      drvBookingId = drvBkgRes.data?.data?.id;
      record('Customer', 'POST /bookings/driver (Create Driver Booking)', drvBkgRes.ok, {
        bookingId: drvBookingId,
        status: drvBkgRes.data?.data?.status,
      }, drvBkgRes.data?.message);

      // Roadside Booking Creation
      const rdsBkgRes = await request('/bookings/roadside', {
        method: 'POST',
        headers: custHeaders,
        body: JSON.stringify({
          vehicleId,
          serviceType: 'roadside_battery_jump',
          pickup: {
            address: 'Jaydev Vihar, Bhubaneswar',
            latitude: 20.3012,
            longitude: 85.8234,
          },
        }),
      });
      roadsideBookingId = rdsBkgRes.data?.data?.booking?.id ?? rdsBkgRes.data?.data?.id;
      record('Customer', 'POST /bookings/roadside (Roadside Assistance Booking)', rdsBkgRes.ok, {
        bookingId: roadsideBookingId,
        status: rdsBkgRes.data?.data?.status,
      }, rdsBkgRes.data?.message);

      // Payment Advance (Gateway integration check)
      if (towBookingId) {
        const payAdvRes = await request('/payments/advance', {
          method: 'POST',
          headers: custHeaders,
          body: JSON.stringify({
            bookingId: towBookingId,
            bookingType: 'towing',
          }),
        });
        const isStub = payAdvRes.data?.data?.gatewayReferenceId?.startsWith('stub_') ||
                      payAdvRes.data?.data?.status === 'COMPLETED' ||
                      payAdvRes.data?.data?.message?.includes('Mock') ||
                      payAdvRes.data?.data?.message?.includes('stub');
        record('Payments', 'POST /payments/advance', payAdvRes.ok, {
          transactionId: payAdvRes.data?.data?.transactionId,
          gatewayReferenceId: payAdvRes.data?.data?.gatewayReferenceId,
          status: payAdvRes.data?.data?.status,
          isGatewayStub: isStub,
        }, payAdvRes.data?.message, isStub ? '⚠️ MOCK / STUB GATEWAY (No Razorpay/Stripe)' : 'Real gateway');
      }
    }

    // SOS Emergency
    const sosConfigRes = await request('/sos/config', { headers: custHeaders });
    record('Customer', 'GET /sos/config', sosConfigRes.ok, sosConfigRes.data?.data);

    const sosAlertRes = await request('/sos/alert', {
      method: 'POST',
      headers: custHeaders,
      body: JSON.stringify({
        action: 'sos',
        latitude: 20.2961,
        longitude: 85.8245,
        address: 'Bhubaneswar, Odisha',
      }),
    });
    record('Customer', 'POST /sos/alert (Trigger SOS Beacon)', sosAlertRes.ok, {
      alertId: sosAlertRes.data?.data?.alertId,
      message: sosAlertRes.data?.data?.message,
    }, sosAlertRes.data?.message);

    // Subscriptions Plans
    const plansRes = await request('/subscriptions/plans');
    record('Customer', 'GET /subscriptions/plans', plansRes.ok, { count: plansRes.data?.data?.length });
  }

  // ----------------------------------------------------------------
  // 4. PARTNER APPLICATION API FLOWS
  // ----------------------------------------------------------------
  console.log('\n--- 4. PARTNER APP API FLOW AUDIT ---');
  // Test Demo Driver Login (Om Singh: +918888880001)
  const drvSendOtp = await request('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber: '8888880001', role: 'driver' }),
  });
  const drvDevOtp = drvSendOtp.data?.data?.devOtp;
  record('Partner/Driver', 'POST /auth/send-otp (driver)', drvSendOtp.ok, { devOtp: drvDevOtp });

  let driverToken = '';
  if (drvDevOtp) {
    const drvVerify = await request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber: '8888880001', otp: drvDevOtp, role: 'driver' }),
    });
    if (drvVerify.ok && drvVerify.data?.data?.accessToken) {
      driverToken = drvVerify.data.data.accessToken;
      record('Partner/Driver', 'POST /auth/verify-otp (driver login)', true, {
        driverName: drvVerify.data.data.user?.fullName,
        driverRole: drvVerify.data.data.user?.role,
      });
    }
  }

  if (driverToken) {
    const drvHeaders = { Authorization: `Bearer ${driverToken}` };

    // Active Bookings (Driver 1 has an active booking)
    const activeRes = await request('/driver/bookings/active', { headers: drvHeaders });
    record('Partner/Driver', 'GET /driver/bookings/active', activeRes.ok, { active: activeRes.data?.data });

    // Active booking guard: availability toggle must be rejected when on active job
    const activeGuardRes = await request('/driver/availability', {
      method: 'PATCH',
      headers: drvHeaders,
      body: JSON.stringify({ isAvailable: true }),
    });
    record(
      'Partner/Driver',
      'PATCH /driver/availability (Active booking safety guard)',
      activeGuardRes.status === 400,
      activeGuardRes.data?.message,
    );

    // Available Driver (Driver 2: 8888880002 has no active job and can go online/offline)
    const drv2SendOtp = await request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber: '8888880002', role: 'driver' }),
    });
    const drv2DevOtp = drv2SendOtp.data?.data?.devOtp;
    if (drv2DevOtp) {
      const drv2Verify = await request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ mobileNumber: '8888880002', otp: drv2DevOtp, role: 'driver' }),
      });
      if (drv2Verify.ok && drv2Verify.data?.data?.accessToken) {
        const drv2Headers = { Authorization: `Bearer ${drv2Verify.data.data.accessToken}` };
        const availRes = await request('/driver/availability', {
          method: 'PATCH',
          headers: drv2Headers,
          body: JSON.stringify({ isAvailable: true }),
        });
        record('Partner/Driver', 'PATCH /driver/availability (Go Online)', availRes.ok, availRes.data?.data);
      }
    }
  }

  // Test Vendor Login (+919812345670 from admin-seed)
  const vndSendOtp = await request('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber: '9812345670', role: 'vendor' }),
  });
  const vndDevOtp = vndSendOtp.data?.data?.devOtp;
  record('Partner/Vendor', 'POST /auth/send-otp (vendor)', vndSendOtp.ok, { devOtp: vndDevOtp });

  let vendorToken = '';
  if (vndDevOtp) {
    const vndVerify = await request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber: '9812345670', otp: vndDevOtp, role: 'vendor' }),
    });
    if (vndVerify.ok && vndVerify.data?.data?.accessToken) {
      vendorToken = vndVerify.data.data.accessToken;
      record('Partner/Vendor', 'POST /auth/verify-otp (vendor login)', true, {
        vendorRole: vndVerify.data.data.user?.role,
      });
    }
  }

  if (vendorToken) {
    const vndHeaders = { Authorization: `Bearer ${vendorToken}` };

    // Vendor Dashboard
    const vndDash = await request('/vendor/dashboard', { headers: vndHeaders });
    record('Partner/Vendor', 'GET /vendor/dashboard', vndDash.ok, vndDash.data?.data);

    // Vendor Drivers List
    const vndDrivers = await request('/vendor/drivers', { headers: vndHeaders });
    record('Partner/Vendor', 'GET /vendor/drivers', vndDrivers.ok, { count: vndDrivers.data?.data?.length });

    // Vendor Vehicles List
    const vndVehicles = await request('/vendor/vehicles', { headers: vndHeaders });
    record('Partner/Vendor', 'GET /vendor/vehicles', vndVehicles.ok, { count: vndVehicles.data?.data?.length });
  }

  // Summary
  console.log('\n====================================================');
  console.log('📊 AUDIT SUMMARY RESULTS');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`Total Checks Executed: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
}

run().catch(console.error);
