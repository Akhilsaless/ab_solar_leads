-- Partner invitation and session hardening.
ALTER TABLE solarPartners
  ADD COLUMN loginTokenHash varchar(64) NULL,
  ADD COLUMN loginExpiresAt bigint NULL,
  ADD COLUMN signupTokenHash varchar(64) NULL,
  ADD COLUMN signupExpiresAt bigint NULL;
