import assert from 'node:assert/strict';

async function main(): Promise<void> {
  // Importing the service module evaluates backend config validation. Use local
  // placeholders so this regression remains offline and never connects to a DB.
  process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/partner-v6-offer-audit';
  process.env.JWT_ACCESS_SECRET ??= 'partner-v6-offline-audit-access-secret-0001';
  process.env.JWT_REFRESH_SECRET ??= 'partner-v6-offline-audit-refresh-secret-0001';

  const { selectOpenOfferBookingTypes } = await import(
    '../services/src/bookings/driverAssignment'
  );
  const { canAddUserCapability, getUserCapabilities } = await import('../auth/src/roles');
  const { vendorApproveBookingSchema, vendorAssignBookingSchema } = await import(
    '../services/src/vendorBookingsValidator'
  );

  assert.equal(
    canAddUserCapability({ role: 'customer' }, 'driver'),
    true,
    'a verified Customer may add the Driver capability',
  );
  assert.deepEqual(
    getUserCapabilities({ role: 'driver', capabilities: ['customer', 'driver'] }),
    ['customer', 'driver'],
    'Customer and Driver access coexist on one account',
  );
  assert.equal(
    canAddUserCapability({ role: 'vendor' }, 'driver'),
    false,
    'a Towing Vendor cannot be converted into a Driver account',
  );

  const driverId = '0123456789abcdef01234567';
  assert.equal(
    vendorApproveBookingSchema.safeParse({ bookingType: 'towing', driverId }).success,
    false,
    'vendor towing dispatch requires a fleet vehicle',
  );
  assert.equal(
    vendorApproveBookingSchema.safeParse({ bookingType: 'driver', driverId }).success,
    true,
    'vendor driver-hire dispatch does not require a fleet vehicle',
  );
  assert.equal(
    vendorAssignBookingSchema.safeParse({ bookingType: 'towing', driverId }).success,
    false,
    'legacy assign endpoint follows the same towing vehicle requirement',
  );
  const select = selectOpenOfferBookingTypes;

  assert.deepEqual(
    select({ audience: 'driver' }),
    ['driver'],
    'independent driver default feed must contain driver-hire bookings only',
  );
  assert.deepEqual(
    select({ audience: 'driver', bookingType: 'towing' }),
    [],
    'an independent driver must not receive towing even when explicitly requested',
  );
  assert.deepEqual(
    select({ audience: 'driver', bookingType: 'driver' }),
    ['driver'],
    'an independent driver may explicitly request driver-hire bookings',
  );
  assert.deepEqual(
    select({ audience: 'driver', vendorLinkedDriver: true }),
    ['towing', 'driver'],
    'vendor-linked drivers retain legacy vendor-routed booking compatibility',
  );
  assert.deepEqual(
    select({ audience: 'driver', bookingType: 'towing', vendorLinkedDriver: true }),
    ['towing'],
    'vendor-linked drivers may explicitly request legacy towing assignments',
  );
  assert.deepEqual(
    select({ audience: 'vendor' }),
    ['towing', 'driver'],
    'vendor portal default feed must keep both booking types',
  );
  assert.deepEqual(
    select({ audience: 'vendor', bookingType: 'driver' }),
    ['driver'],
    'vendor portal explicit booking type must remain respected',
  );
  assert.deepEqual(
    select({ audience: 'internal' }),
    ['towing', 'driver'],
    'unscoped legacy consumers retain both booking types',
  );

  console.log('PARTNER_V6_ROLE_DISPATCH_AUDIT_PASSED');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
