ALTER TABLE `panelProducts3`
  ADD COLUMN `pricingVersion` varchar(80) NOT NULL DEFAULT 'draft',
  ADD COLUMN `effectiveFrom` date,
  ADD COLUMN `effectiveTo` date,
  ADD COLUMN `sourceNote` text,
  ADD COLUMN `lastVerifiedAt` timestamp NULL,
  ADD COLUMN `isPriceActive` boolean NOT NULL DEFAULT false;

ALTER TABLE `inverterProducts3`
  ADD COLUMN `pricingVersion` varchar(80) NOT NULL DEFAULT 'draft',
  ADD COLUMN `effectiveFrom` date,
  ADD COLUMN `effectiveTo` date,
  ADD COLUMN `sourceNote` text,
  ADD COLUMN `lastVerifiedAt` timestamp NULL,
  ADD COLUMN `isPriceActive` boolean NOT NULL DEFAULT false;

CREATE TABLE `agencyEstimateSettings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agencyId` int NOT NULL,
  `pricingVersion` varchar(80) NOT NULL DEFAULT 'draft',
  `pricingMode` enum('catalog','quote_only') NOT NULL DEFAULT 'catalog',
  `installationCostPerKw` decimal(10,2),
  `balanceOfSystemCostPerKw` decimal(10,2),
  `taxRatePercent` decimal(5,2),
  `warrantyTerms` text,
  `pricingDisclosure` text,
  `sourceNote` text,
  `effectiveFrom` date,
  `effectiveTo` date,
  `lastVerifiedAt` timestamp NULL,
  `isPricingActive` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `agencyEstimateSettings_id` PRIMARY KEY(`id`),
  CONSTRAINT `agencyEstimateSettings_agency_unique` UNIQUE(`agencyId`)
);

CREATE TABLE `agencyStateEstimateInputs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agencyId` int NOT NULL,
  `stateName` varchar(100) NOT NULL,
  `stateCode` varchar(10) NOT NULL,
  `discomName` varchar(200),
  `tariffPerUnit` decimal(8,4),
  `avgSunHours` decimal(5,2),
  `systemLossPercent` decimal(5,2),
  `netMeteringStatus` enum('unknown','available','limited','unavailable') NOT NULL DEFAULT 'unknown',
  `subsidyDisclosure` text,
  `subsidySourceUrl` text,
  `sourceNote` text,
  `effectiveFrom` date,
  `effectiveTo` date,
  `lastVerifiedAt` timestamp NULL,
  `isActive` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `agencyStateEstimateInputs_id` PRIMARY KEY(`id`),
  CONSTRAINT `agencyStateEstimateInputs_agency_state_unique` UNIQUE(`agencyId`,`stateCode`)
);

CREATE TABLE `agencyFeatureControls` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agencyId` int NOT NULL,
  `emailAutomationEnabled` boolean NOT NULL DEFAULT false,
  `whatsappAutomationEnabled` boolean NOT NULL DEFAULT false,
  `smsOtpEnabled` boolean NOT NULL DEFAULT false,
  `scheduledFollowUpsEnabled` boolean NOT NULL DEFAULT false,
  `optionalAiFeaturesEnabled` boolean NOT NULL DEFAULT false,
  `updatedByUserId` int,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `agencyFeatureControls_id` PRIMARY KEY(`id`),
  CONSTRAINT `agencyFeatureControls_agency_unique` UNIQUE(`agencyId`)
);

CREATE TABLE `agencyConfigurationAudit` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agencyId` int NOT NULL,
  `actorUserId` int,
  `action` varchar(120) NOT NULL,
  `entityType` varchar(80) NOT NULL,
  `entityId` int,
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `agencyConfigurationAudit_id` PRIMARY KEY(`id`),
  INDEX `agencyConfigurationAudit_agency_created_idx` (`agencyId`,`id`)
);

INSERT INTO `agencyFeatureControls` (`agencyId`)
SELECT `id` FROM `agencyConfig3`
ON DUPLICATE KEY UPDATE `agencyId` = VALUES(`agencyId`);
