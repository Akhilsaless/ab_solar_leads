import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[release:verify] DATABASE_URL is required.");
  process.exit(2);
}

const connection = await mysql.createConnection(databaseUrl);

try {
  const [columnRows] = await connection.query<any[]>(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'leads2'
      AND COLUMN_NAME = 'agencyId'
  `);

  const [indexRows] = await connection.query<any[]>(`
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'leads2'
      AND INDEX_NAME = 'idx_leads2_agency_created'
    LIMIT 1
  `);

  const [unassignedRows] = await connection.query<any[]>(`
    SELECT COUNT(*) AS count
    FROM leads2
    WHERE agencyId IS NULL
  `);

  const [badReferrerRows] = await connection.query<any[]>(`
    SELECT COUNT(*) AS count
    FROM referrers
    WHERE totalReferrals = 0 AND COALESCE(qualityScore, 0) <> 0
  `);

  const hasAgencyColumn = columnRows.length === 1;
  const hasAgencyCreatedIndex = indexRows.length === 1;
  const unassignedLeads = Number(unassignedRows[0]?.count ?? 0);
  const invalidEmptyHistoryScores = Number(badReferrerRows[0]?.count ?? 0);

  const checks = {
    leadsAgencyIdColumn: hasAgencyColumn,
    leadsAgencyCreatedIndex: hasAgencyCreatedIndex,
    unassignedLeads,
    invalidEmptyHistoryScores,
  };

  console.log("[release:verify]", JSON.stringify(checks, null, 2));

  const ready =
    hasAgencyColumn &&
    hasAgencyCreatedIndex &&
    unassignedLeads === 0 &&
    invalidEmptyHistoryScores === 0;

  if (!ready) {
    console.error("[release:verify] Production database is NOT release-ready.");
    process.exitCode = 1;
  } else {
    console.log("[release:verify] Production database is release-ready.");
  }
} finally {
  await connection.end();
}
