import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

function rows(result) {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}
function firstRow(result) {
  const r = rows(result);
  return r.length > 0 ? r[0] : null;
}

async function test() {
  // First, insert a test referrer
  const ins = await db.execute(sql`INSERT INTO referrers (uniqueCode, name, email, totalEarnings, totalReferrals, status) VALUES ('TEST_DBG_001', 'Debug User', 'debug@test.com', 500, 2, 'active')`);
  const newId = ins[0]?.insertId;
  console.log('Inserted referrer with id:', newId);

  // Now test getDashboard logic
  const code = 'TEST_DBG_001';
  const referrerResult = await db.execute(sql`SELECT * FROM referrers WHERE uniqueCode = ${code}`);
  const ref = firstRow(referrerResult);
  console.log('ref:', JSON.stringify(ref));
  console.log('ref.id:', ref?.id);

  if (!ref) {
    console.log('ERROR: ref is null, would return null');
    return;
  }

  // Test the referrals query with the id
  console.log('Running referrals query with id:', ref.id);
  const referralsResult = await db.execute(sql`SELECT * FROM referrals WHERE referrerId = ${ref.id} ORDER BY createdAt DESC`);
  console.log('Referrals:', JSON.stringify(rows(referralsResult)));

  // Cleanup
  await db.execute(sql`DELETE FROM referrers WHERE uniqueCode = 'TEST_DBG_001'`);
  console.log('Test passed! Cleanup done.');
}

test().catch(e => console.error('Test failed:', e.message));
