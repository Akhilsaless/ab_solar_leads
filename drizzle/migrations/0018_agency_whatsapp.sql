CREATE TABLE agencyWhatsAppConnections (
  agencyId int PRIMARY KEY,
  encryptedConfig text NOT NULL,
  phoneNumberId varchar(100) NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  verifiedAt timestamp NULL,
  webhookVerifiedAt timestamp NULL,
  templateVerifiedAt timestamp NULL,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE solarWhatsAppMessages (
  id int AUTO_INCREMENT PRIMARY KEY,
  agencyId int NOT NULL,
  leadId int NOT NULL,
  direction varchar(10) NOT NULL,
  providerMessageId varchar(255) NULL UNIQUE,
  dedupeKey char(64) NOT NULL UNIQUE,
  body text NOT NULL,
  providerTimestamp bigint NULL,
  status varchar(30) NOT NULL DEFAULT 'pending',
  lastError varchar(100) NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX queue_status (status, id),
  INDEX agency_inbox (agencyId, leadId, id)
);
CREATE TABLE solarWhatsAppReceipts (
  id int AUTO_INCREMENT PRIMARY KEY,
  agencyId int NOT NULL,
  providerMessageId varchar(255) NOT NULL,
  status varchar(30) NOT NULL,
  errorCode varchar(100) NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY receipt_once (agencyId, providerMessageId, status)
);
