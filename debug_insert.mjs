import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

async function test() {
  const result = await db.execute(
    sql`INSERT INTO referrers (uniqueCode, name, email, totalEarnings, totalReferrals, status) 
        VALUES ('TEST_INS_DEBUG', 'Debug Insert', 'debug_ins@test.com', 0, 0, 'active')`
  );
  console.log('Insert result type:', typeof result);
  console.log('Is array:', Array.isArray(result));
  console.log('Keys:', Object.keys(result));
  console.log('result:', JSON.stringify(result));
  console.log('result[0]:', JSON.stringify(result[0]));
  console.log('result[0]?.insertId:', result[0]?.insertId);
  console.log('(result as any).insertId:', (result).insertId);
  
  // Cleanup
  await db.execute(sql`DELETE FROM referrers WHERE uniqueCode = 'TEST_INS_DEBUG'`);
}

test().catch(e => console.error('Error:', e.message));
