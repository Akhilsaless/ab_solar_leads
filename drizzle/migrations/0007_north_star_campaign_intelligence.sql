CREATE TABLE IF NOT EXISTS campaignClients (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  agencyId int NOT NULL,
  name varchar(255) NOT NULL,
  industry varchar(120) NULL,
  contactName varchar(160) NULL,
  contactEmail varchar(320) NULL,
  contactPhone varchar(40) NULL,
  status enum('active','inactive') NOT NULL DEFAULT 'active',
  notes text NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_campaign_clients_agency (agencyId)
);

CREATE TABLE IF NOT EXISTS campaignProfiles (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaignId int NOT NULL,
  agencyId int NOT NULL,
  clientId int NULL,
  industry varchar(120) NULL,
  geography text NULL,
  leadRequirement text NULL,
  leadSource varchar(120) NULL,
  appointmentTarget int NOT NULL DEFAULT 0,
  campaignCost decimal(14,2) NULL,
  startDate timestamp NULL,
  endDate timestamp NULL,
  assignedTeam json NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_profile_campaign (campaignId),
  KEY idx_campaign_profiles_agency (agencyId),
  KEY idx_campaign_profiles_client (clientId)
);

CREATE TABLE IF NOT EXISTS campaignLeadRecords (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaignId int NOT NULL,
  leadId int NULL,
  source varchar(120) NOT NULL,
  status enum('generated','validated','qualified','contacted','interested','appointment','appointment_validated','delivered','accepted','rejected','lost') NOT NULL DEFAULT 'generated',
  qualityScore int NOT NULL DEFAULT 0,
  scoreExplanation json NULL,
  isDuplicate boolean NOT NULL DEFAULT FALSE,
  assignedTo int NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_campaign_leads_campaign_status (campaignId, status),
  KEY idx_campaign_leads_lead (leadId)
);

CREATE TABLE IF NOT EXISTS campaignLeadEvents (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaignId int NOT NULL,
  campaignLeadId int NOT NULL,
  eventType enum('generated','validated','qualified','contact_attempt','conversation','interested','appointment_set','appointment_validated','delivered','accepted','rejected','revenue_recorded','note') NOT NULL,
  eventAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actorUserId int NULL,
  details json NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_campaign_events_record (campaignLeadId, eventAt),
  KEY idx_campaign_events_campaign (campaignId, eventAt)
);

CREATE TABLE IF NOT EXISTS campaignAppointments (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaignLeadId int NOT NULL,
  scheduledAt timestamp NULL,
  status enum('scheduled','validated','invalid','no_show','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  assignedTo int NULL,
  notes text NULL,
  validatedAt timestamp NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_campaign_appointments_record (campaignLeadId, status)
);

CREATE TABLE IF NOT EXISTS campaignDeliveries (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaignLeadId int NOT NULL,
  clientId int NOT NULL,
  status enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  rejectionReason varchar(160) NULL,
  rejectionNotes text NULL,
  deliveredAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decidedAt timestamp NULL,
  revenue decimal(14,2) NULL,
  commission decimal(14,2) NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_campaign_deliveries_record (campaignLeadId),
  KEY idx_campaign_deliveries_client_status (clientId, status)
);

CREATE TABLE IF NOT EXISTS campaignQualityConfigs (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  campaignId int NOT NULL,
  weights json NOT NULL,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_quality_config_campaign (campaignId)
);
