-- Partner self-service onboarding mapping and durable progress.
-- Additive only: existing partner accounts are linked lazily at their next sign-in.
CREATE TABLE IF NOT EXISTS `partnerAgencyOnboarding` (
  `id` int NOT NULL AUTO_INCREMENT,
  `partnerId` int NOT NULL,
  `agencyId` int NOT NULL,
  `onboardingStatus` enum('setup_required','partially_configured','ready') NOT NULL DEFAULT 'setup_required',
  `currentStep` int NOT NULL DEFAULT 1,
  `completedSteps` json NULL,
  `subsidyMode` enum('disclose_verified','hide_amount') NOT NULL DEFAULT 'hide_amount',
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `partnerAgencyOnboarding_partner_unique` (`partnerId`),
  UNIQUE KEY `partnerAgencyOnboarding_agency_unique` (`agencyId`),
  KEY `partnerAgencyOnboarding_status_idx` (`onboardingStatus`)
);
