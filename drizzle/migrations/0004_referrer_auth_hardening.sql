-- Referrer account hardening: hashed, expiring setup and session tokens plus
-- OTP throttling metadata. Existing accounts remain usable through login.

ALTER TABLE referrers
  ADD COLUMN sessionTokenHash varchar(64) NULL,
  ADD COLUMN sessionExpiresAt bigint NULL,
  ADD COLUMN passwordSetupTokenHash varchar(64) NULL,
  ADD COLUMN passwordSetupExpiresAt bigint NULL;

ALTER TABLE otp_store
  ADD COLUMN otpHash varchar(64) NULL,
  ADD COLUMN attempts int NOT NULL DEFAULT 0,
  ADD COLUMN lastSentAt bigint NULL;
