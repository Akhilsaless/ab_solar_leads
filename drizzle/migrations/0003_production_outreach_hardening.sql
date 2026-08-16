-- Production outreach hardening
-- This migration preserves existing configuration rows in a backup table, then
-- makes one disabled, email-only master configuration per agency.

CREATE TABLE IF NOT EXISTS outreachConfig_backup_20260816 LIKE outreachConfig;
INSERT INTO outreachConfig_backup_20260816
SELECT * FROM outreachConfig
WHERE NOT EXISTS (SELECT 1 FROM outreachConfig_backup_20260816 LIMIT 1);

-- Retain the earliest configuration for each agency; the backup above preserves history.
DELETE newer
FROM outreachConfig AS newer
JOIN outreachConfig AS keeper
  ON newer.agencyId = keeper.agencyId
 AND newer.id > keeper.id;

-- Never resume sends automatically after a hardening migration. WhatsApp remains disabled
-- until a verified provider is configured.
UPDATE outreachConfig
SET isEnabled = 0,
    contactMethod = 'email';

ALTER TABLE outreachConfig
  ADD UNIQUE KEY outreachConfig_agencyId_unique (agencyId);

ALTER TABLE outreachRuns
  ADD COLUMN runKey varchar(120) NULL,
  ADD COLUMN scheduledDate date NULL;

-- Preserve historical runs while giving each one a unique archival key.
UPDATE outreachRuns
SET runKey = CONCAT('legacy-', id),
    scheduledDate = DATE(startedAt)
WHERE runKey IS NULL;

ALTER TABLE outreachRuns
  MODIFY COLUMN status enum('queued','running','skipped_paused','skipped_duplicate','completed','partially_completed','failed') NOT NULL DEFAULT 'queued',
  ADD UNIQUE KEY outreachRuns_runKey_unique (runKey);
