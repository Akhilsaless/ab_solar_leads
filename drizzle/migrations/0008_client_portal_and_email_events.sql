CREATE TABLE IF NOT EXISTS campaignDeliveryAccess (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  deliveryId int NOT NULL,
  tokenHash varchar(128) NOT NULL,
  expiresAt timestamp NOT NULL,
  revokedAt timestamp NULL,
  lastViewedAt timestamp NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_delivery_access_delivery (deliveryId),
  KEY idx_campaign_delivery_access_expiry (expiresAt)
);

CREATE TABLE IF NOT EXISTS emailEventLogs (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider varchar(80) NOT NULL,
  externalEventId varchar(200) NOT NULL,
  eventType enum('delivered','bounced','complained','opened','clicked','replied','unknown') NOT NULL,
  recipient varchar(320) NULL,
  outreachRecordId int NULL,
  payload json NOT NULL,
  receivedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_event_external_id (externalEventId),
  KEY idx_email_event_outreach (outreachRecordId),
  KEY idx_email_event_type_received (eventType, receivedAt)
);
