/**
 * MVP local smoke — hits a running API without mutating prod data.
 * Usage: cd backend && npm run mvp:smoke
 * Env: API_BASE_URL (default http://127.0.0.1:3000)
 */
const base = (process.env.API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

async function get(path: string) {
  const res = await fetch(`${base}${path}`);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep text
  }
  return { status: res.status, body };
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main() {
  console.log(`MVP smoke → ${base}`);

  const health = await get('/health');
  if (health.status !== 200) {
    fail(`GET /health expected 200, got ${health.status}`);
  }
  console.log('✓ /health');

  const availability = await get('/api/v1/bookings/roadside/availability');
  if (availability.status !== 200) {
    fail(`roadside availability expected 200, got ${availability.status}`);
  }
  const payload = availability.body as {
    success?: boolean;
    data?: { items?: Array<{ serviceType: string; available: boolean }>; bookableCount?: number };
  };
  const items = payload?.data?.items;
  if (!Array.isArray(items) || items.length === 0) {
    fail('roadside availability returned no items (restart API after pull + optional seed)');
  }
  const tyre = items.find(i => i.serviceType === 'roadside_flat_tyre');
  if (!tyre?.available) {
    fail('roadside_flat_tyre should be available after MVP backend enablement');
  }
  console.log(`✓ roadside availability (${items.length} services, flat tyre bookable)`);

  const badId = await get('/api/v1/bookings/towing/not-an-object-id/tracking');
  if (badId.status !== 400) {
    fail(`malformed booking id should 400, got ${badId.status}`);
  }
  console.log('✓ malformed id → 400');

  console.log('\nMVP smoke passed.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
