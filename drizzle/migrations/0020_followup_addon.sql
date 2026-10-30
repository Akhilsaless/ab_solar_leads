CREATE TABLE followupAccounts (
  agencyId int PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  encryptedConfig mediumtext NULL,
  balancePaise bigint NOT NULL DEFAULT 0,
  monthlyLimitPaise int NOT NULL DEFAULT 0,
  monthKey char(7) NOT NULL DEFAULT '',
  monthReservedPaise bigint NOT NULL DEFAULT 0,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE followupJobs (
  id int AUTO_INCREMENT PRIMARY KEY,
  agencyId int NOT NULL,
  leadId int NOT NULL,
  kind varchar(20) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'queued',
  dedupeKey char(64) NOT NULL UNIQUE,
  payload mediumtext NOT NULL,
  providerId varchar(255) NULL,
  callbackTokenHash char(64) NULL,
  reservedPaise int NOT NULL DEFAULT 0,
  chargedPaise int NULL,
  billingMonth char(7) NULL,
  result mediumtext NULL,
  errorCode varchar(100) NULL,
  dueAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY provider_job (kind, providerId),
  INDEX job_queue (status, dueAt),
  INDEX agency_jobs (agencyId, leadId, id)
);
CREATE TABLE followupLedger (
  id int AUTO_INCREMENT PRIMARY KEY,
  agencyId int NOT NULL,
  jobId int NULL,
  eventKey varchar(160) NOT NULL UNIQUE,
  amountPaise bigint NOT NULL,
  description varchar(255) NOT NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX agency_statement (agencyId, id)
);
CREATE TABLE followupIntake (
  agencyId int NOT NULL,
  externalId varchar(160) NOT NULL,
  leadId int NULL,
  consentEvidence text NOT NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agencyId, externalId)
);
CREATE TABLE followupMetaInbox (
  agencyId int NOT NULL,
  leadgenId varchar(100) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'queued',
  errorCode varchar(100) NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (agencyId, leadgenId)
);
CREATE TABLE solarBillUploadReceipts (
  urlHash char(64) PRIMARY KEY,
  sessionId varchar(128) NOT NULL,
  contentType varchar(50) NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  result mediumtext NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX session_uploads (sessionId, createdAt)
);
