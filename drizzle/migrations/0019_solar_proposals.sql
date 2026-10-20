CREATE TABLE solarProposals (
  id int AUTO_INCREMENT PRIMARY KEY,
  leadId int NOT NULL,
  partnerId int NOT NULL,
  reference varchar(100) NOT NULL UNIQUE,
  contentHash char(64) NOT NULL UNIQUE,
  snapshot json NOT NULL,
  pdfBase64 longtext NOT NULL,
  validUntil date NOT NULL,
  downloadTokenHash char(64) NULL UNIQUE,
  encryptedDownloadToken text NULL,
  downloadExpiresAt timestamp NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX lead_proposals (leadId, id)
);
CREATE TABLE solarCommercialAccruals (
  id int AUTO_INCREMENT PRIMARY KEY,
  leadId int NOT NULL,
  partnerId int NOT NULL,
  milestone varchar(40) NOT NULL,
  model varchar(40) NOT NULL,
  rate decimal(12,2) NOT NULL,
  amountPaise bigint NOT NULL,
  termsEffectiveFrom date NOT NULL,
  termsReference text NOT NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY milestone_once (leadId, partnerId, milestone)
);
