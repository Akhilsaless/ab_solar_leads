-- Attribute every lead to an agency so reads and mutations can be tenant-scoped.
ALTER TABLE leads2 ADD COLUMN agencyId int NULL AFTER id;

UPDATE leads2 l
JOIN conversations3 c ON c.id = l.conversationId
SET l.agencyId = c.agencyId
WHERE l.agencyId IS NULL;

-- Backfill scraper leads only when a matching contact belongs to exactly one agency.
UPDATE leads2 l
JOIN (
  SELECT phone, MIN(agencyId) AS agencyId
  FROM scrapedBusinesses
  WHERE phone IS NOT NULL AND phone <> ''
  GROUP BY phone
  HAVING COUNT(DISTINCT agencyId) = 1
) s ON s.phone = l.phone
SET l.agencyId = s.agencyId
WHERE l.agencyId IS NULL AND l.source = 'scraper';

UPDATE leads2 l
JOIN (
  SELECT email, MIN(agencyId) AS agencyId
  FROM scrapedBusinesses
  WHERE email IS NOT NULL AND email <> ''
  GROUP BY email
  HAVING COUNT(DISTINCT agencyId) = 1
) s ON LOWER(s.email) = LOWER(l.email)
SET l.agencyId = s.agencyId
WHERE l.agencyId IS NULL AND l.source = 'scraper';

CREATE INDEX idx_leads2_agency_created ON leads2 (agencyId, createdAt);

-- Empty histories are not perfect-quality histories.
UPDATE referrers SET qualityScore = 0 WHERE totalReferrals = 0;
