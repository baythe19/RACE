/**
 * Seed guard — blocks mock/seed data generation unless explicitly overridden.
 *
 * Background (2026-10-27): the admin panel was purged of ALL mock/demo data by
 * user instruction. The panel must contain ONLY live data going forward.
 * Seed scripts kept re-populating test users/bookings, so every entry script
 * now fails fast unless the operator REALLY means it.
 *
 * Fire escape: ALLOW_MOCK_SEED=1 npm run seed:mock   (deliberate, documented)
 */
export function assertSeedAllowed(scriptName: string): void {
  if (process.env.ALLOW_MOCK_SEED === '1') return;

  console.error(
    [
      '',
      `[seed-guard] "${scriptName}" BLOCKED.`,
      '',
      'The admin panel is live-data only (user directive 2026-10-27).',
      'Seeding would re-create mock customers, vendors, drivers and bookings.',
      '',
      'If you are ABSOLUTELY sure you want mock data back, run:',
      `  ALLOW_MOCK_SEED=1 npm run ${scriptName}`,
      '',
    ].join('\n'),
  );
  process.exit(1);
}
