-- Additive only. Apply once after 0016. No existing lead data is rewritten.
CREATE TABLE partnerSalesOperations (
  partnerId int PRIMARY KEY,
  acceptingLeads boolean NOT NULL DEFAULT false,
  serviceCities json NULL,
  servicePincodes json NULL,
  commercialModel varchar(40) NOT NULL DEFAULT 'not_agreed',
  commercialRate decimal(12,2) NULL,
  termsEffectiveFrom date NULL,
  termsNote text NULL,
  termsUpdatedBy int NULL,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE solarSurveySlots (
  id int AUTO_INCREMENT PRIMARY KEY,
  partnerId int NOT NULL,
  startsAt datetime NOT NULL,
  endsAt datetime NOT NULL,
  city varchar(100) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'available',
  leadId int NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY partner_start (partnerId, startsAt),
  INDEX available_slots (partnerId, status, startsAt)
);
CREATE TABLE solarLeadWorkflow (
  leadId int PRIMARY KEY,
  partnerId int NULL,
  stage varchar(40) NOT NULL DEFAULT 'awaiting_partner',
  surveySlotId int NULL,
  version int NOT NULL DEFAULT 0,
  revenuePaise bigint NULL,
  paymentReference varchar(200) NULL,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX partner_stage (partnerId, stage)
);
CREATE TABLE solarWorkflowEvents (
  id int AUTO_INCREMENT PRIMARY KEY,
  leadId int NOT NULL,
  partnerId int NULL,
  actor varchar(100) NOT NULL,
  fromStage varchar(40) NULL,
  toStage varchar(40) NOT NULL,
  note varchar(2000) NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX lead_history (leadId, id)
);
CREATE TABLE leadCaptureKeys (
  captureKey char(64) PRIMARY KEY,
  leadId int NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE solarChatIdentity (
  sessionId varchar(128) PRIMARY KEY,
  agencyId int NOT NULL,
  phone varchar(30) NULL,
  consentAt timestamp NULL,
  whatsappConsentAt timestamp NULL,
  revokedAt timestamp NULL,
  phoneVerifiedAt timestamp NULL,
  otpRequestedAt timestamp NULL,
  otpAttempts int NOT NULL DEFAULT 0,
  otpGeneration int NOT NULL DEFAULT 0
);
CREATE TABLE solarOtpLimits (
  phoneHash char(64) PRIMARY KEY,
  lastRequestedAt datetime NULL,
  windowStartedAt datetime NOT NULL,
  requestCount int NOT NULL DEFAULT 0
);
