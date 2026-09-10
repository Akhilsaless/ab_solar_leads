CREATE TABLE `platformCommunicationSettings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `channel` enum('email','whatsapp') NOT NULL,
  `provider` varchar(80) NOT NULL DEFAULT 'not_configured',
  `connectionMode` enum('smtp','api') NOT NULL,
  `encryptedConfig` text,
  `configuredFields` json,
  `status` enum('not_configured','authentication_error','template_setup_required','ready','running','paused','off','error') NOT NULL DEFAULT 'not_configured',
  `automationState` enum('off','paused','running') NOT NULL DEFAULT 'off',
  `lastVerifiedAt` timestamp NULL,
  `lastSuccessfulSendAt` timestamp NULL,
  `lastErrorCode` varchar(100),
  `lastErrorMessage` varchar(500),
  `updatedByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `platformCommunicationSettings_id` PRIMARY KEY(`id`),
  CONSTRAINT `platformCommunicationSettings_channel_unique` UNIQUE(`channel`)
);

CREATE TABLE `platformSafetyControls` (
  `id` int AUTO_INCREMENT NOT NULL,
  `emergencyStopActive` boolean NOT NULL DEFAULT true,
  `updatedByUserId` int,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `platformSafetyControls_id` PRIMARY KEY(`id`)
);

CREATE TABLE `platformCommunicationAudit` (
  `id` int AUTO_INCREMENT NOT NULL,
  `channel` enum('email','whatsapp','global') NOT NULL,
  `actorUserId` int,
  `action` varchar(120) NOT NULL,
  `result` varchar(80) NOT NULL,
  `fromState` varchar(40),
  `toState` varchar(40),
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `platformCommunicationAudit_id` PRIMARY KEY(`id`),
  INDEX `platformCommunicationAudit_channel_created_idx` (`channel`,`id`)
);

INSERT INTO `platformCommunicationSettings` (`channel`, `provider`, `connectionMode`, `status`, `automationState`)
VALUES
  ('email', 'not_configured', 'smtp', 'not_configured', 'off'),
  ('whatsapp', 'not_configured', 'api', 'not_configured', 'off');

INSERT INTO `platformSafetyControls` (`emergencyStopActive`) VALUES (true);
