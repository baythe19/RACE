/**
 * Live smoke against Render (Tier B) — auth, book, stub pay, vendor + admin.
 * Does not mutate QA partner accounts beyond reading vendor bookings.
 *
 *   RENDER_API_URL=https://race-api-w361.onrender.com npm run smoke:render
 */
const BASE = (process.env.RENDER_API_URL ?? 'https://race-api-w361.onrender.com').replace(/\/$/, '');
const PREFIX = `${BASE}/api/v1`;

type Row = { name: string; ok: boolean; detail?: string };

const rows: Row[] = [];

function record(name: string, ok: boolean, detail?: string) {
  rows.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function json(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (init?.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${PREFIX}${path}`, { ...init, headers });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function otpLogin(mobileNumber: string, role: string): Promise<string> {
  const send = await json('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber, role }),
  });
  if (!send.body?.success) {
    record(`${role} send-otp (${mobileNumber})`, false, send.body?.message);
    return '';
  }
  const otp = send.body?.data?.devOtp ?? '123456';
  const verify = await json('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ mobileNumber, otp, role }),
  });
  const token = verify.body?.data?.accessToken ?? '';
  record(
    `${role} verify-otp (${mobileNumber})`,
    verify.status === 200 && Boolean(token),
    verify.body?.data?.user?.isProfileCompleted === false ? 'profile incomplete' : undefined,
  );
  return token;
}

async function runRenderTierBSmoke() {
  console.log(`\n=== Render Tier-B smoke ===\nAPI: ${BASE}\n`);

  const health = await fetch(`${BASE}/health`);
  record('GET /health', health.ok);

  const customerToken = await otpLogin('9000000005', 'customer');
  if (customerToken) {
    const vehicles = await json('/vehicles', { token: customerToken });
    const vehicleId = vehicles.body?.data?.[0]?.id;
    record('GET /vehicles (customer)', vehicles.body?.success && Boolean(vehicleId), vehicleId ? undefined : 'no vehicle — run ensure:test-accounts on Atlas');

    if (vehicleId) {
      const tow = await json('/bookings/towing', {
        method: 'POST',
        token: customerToken,
        body: JSON.stringify({
          vehicleId,
          pickup: { address: 'Master Canteen', latitude: 20.2644, longitude: 85.8433 },
          dropoff: { address: 'Patia', latitude: 20.3588, longitude: 85.8333 },
        }),
      });
      const bookingId = tow.body?.data?.id;
      record('POST /bookings/towing', tow.body?.success && Boolean(bookingId), tow.body?.message);

      if (bookingId) {
        const adv = await json('/payments/advance', {
          method: 'POST',
          token: customerToken,
          body: JSON.stringify({ bookingId, bookingType: 'towing' }),
        });
        const tx = adv.body?.data?.transactionId;
        const stubOk = adv.body?.success && Boolean(adv.body?.data?.gatewayReferenceId?.startsWith('stub_'));
        record('POST /payments/advance (stub)', stubOk, adv.body?.message);

        if (tx) {
          const ver = await json('/payments/advance/verify', {
            method: 'POST',
            token: customerToken,
            body: JSON.stringify({ transactionId: tx, status: 'success' }),
          });
          record(
            'POST /payments/advance/verify',
            ver.body?.success && ver.body?.data?.status === 'success',
            ver.body?.message,
          );
        }
      }
    }
  }

  const vendorToken = await otpLogin('9000000001', 'vendor');
  if (vendorToken) {
    const bookings = await json('/vendor/bookings', { token: vendorToken });
    const count = Array.isArray(bookings.body?.data) ? bookings.body.data.length : 0;
    record('GET /vendor/bookings', bookings.body?.success, `count=${count}`);
  }

  const adminLogin = await json('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin@raceservice.com', password: 'Admin@123' }),
  });
  const adminToken = adminLogin.body?.data?.tokens?.accessToken ?? '';
  record('POST /admin/auth/login', adminLogin.body?.success && Boolean(adminToken));

  if (adminToken) {
    const dash = await json('/admin/dashboard', { token: adminToken });
    record('GET /admin/dashboard', dash.body?.success);
  }

  const failed = rows.filter(r => !r.ok).length;
  console.log(`\n${rows.length - failed}/${rows.length} passed\n`);
  process.exit(failed ? 1 : 0);
}

runRenderTierBSmoke().catch(err => {
  console.error(err);
  process.exit(1);
});
