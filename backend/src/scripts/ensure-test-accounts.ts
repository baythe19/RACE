/**
 * ensure-test-accounts.ts — NON-DESTRUCTIVE idempotent ensure for QA accounts.
 *
 * Upserts partner/vendor QA mobiles + customer 900000000005 (profile + vehicle).
 * Safe on shared Atlas (Render). Run: npm run ensure:test-accounts
 */
import { connectDatabase, disconnectDatabase } from '../database/src/connection';
import { upsertQaAccounts } from '../services/src/qaAccounts';
import { subscriptionService } from '../services/src/subscription';

async function main(): Promise<void> {
  await connectDatabase();
  console.log('\n=== Ensuring QA test accounts (non-destructive) ===\n');

  const lines = await upsertQaAccounts();
  for (const line of lines) {
    console.log(`  ✓ ${line}`);
  }

  await subscriptionService.ensurePlansSeeded();

  console.log('\n=== QA TEST ACCOUNTS ENSURED (nothing deleted) ===');
  console.log('  Customer 9000000005 | Vendor 9000000001 | FT 9000000002 | PT 9000000003 | VM 9000000004');
  console.log('  Universal OTP: 123456 | VM login: qa.driver.vf / Test@123');

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error('Ensure failed:', error);
  await disconnectDatabase();
  process.exit(1);
});
