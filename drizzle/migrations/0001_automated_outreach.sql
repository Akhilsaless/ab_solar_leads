-- Migration: Add Automated Outreach Tables
-- Purpose: Support daily automated WhatsApp/Email outreach to Telangana businesses
-- Date: 2026-07-28

-- Table 1: Automated Outreach Configuration
CREATE TABLE IF NOT EXISTS `automatedOutreachConfig` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `agencyId` int NOT NULL,
  `state` varchar(100) NOT NULL,
  `businessTypes` json,
  `minRating` decimal(3, 1) DEFAULT '3.5',
  `contactsPerDay` int DEFAULT 30,
  `scheduleTime` varchar(10) DEFAULT '10:00',
  `messageType` enum('generic', 'industry_specific') DEFAULT 'industry_specific',
  `isEnabled` boolean DEFAULT true,
  `includeFollowUp` boolean DEFAULT true,
  `followUpDays` int DEFAULT 3,
  `adminPhoneNumber` varchar(30),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_agencyId` (`agencyId`),
  KEY `idx_state` (`state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: Outreach Campaign Records
CREATE TABLE IF NOT EXISTS `outreachCampaignRecords` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `configId` int NOT NULL,
  `businessId` int NOT NULL,
  `businessName` varchar(300) NOT NULL,
  `businessType` varchar(100),
  `ownerName` varchar(200),
  `phone` varchar(50),
  `email` varchar(320),
  `contactMethod` enum('whatsapp', 'email', 'both') NOT NULL,
  `messageBody` text NOT NULL,
  `chatbotLink` text,
  `status` enum('queued', 'sent', 'delivered', 'opened', 'replied', 'failed') DEFAULT 'queued',
  `sentAt` timestamp NULL,
  `deliveredAt` timestamp NULL,
  `openedAt` timestamp NULL,
  `repliedAt` timestamp NULL,
  `replyText` text,
  `replySource` enum('whatsapp', 'email', 'manual'),
  `leadScore` int DEFAULT 0,
  `isFollowUp` boolean DEFAULT false,
  `followUpScheduledFor` timestamp NULL,
  `errorMessage` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_configId` (`configId`),
  KEY `idx_businessId` (`businessId`),
  KEY `idx_status` (`status`),
  KEY `idx_createdAt` (`createdAt`),
  CONSTRAINT `fk_outreach_config` FOREIGN KEY (`configId`) REFERENCES `automatedOutreachConfig` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: Lead Scoring Configuration
CREATE TABLE IF NOT EXISTS `leadScoringConfig` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `agencyId` int NOT NULL,
  `businessTypeScores` json,
  `sizeScores` json,
  `ratingScores` json,
  `contactQualityScores` json,
  `engagementScores` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_agencyId` (`agencyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 4: Data Verification Log
CREATE TABLE IF NOT EXISTS `dataVerificationLog` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `businessId` int NOT NULL,
  `emailValid` boolean DEFAULT false,
  `phoneValid` boolean DEFAULT false,
  `phoneHasWhatsapp` boolean DEFAULT false,
  `websiteActive` boolean DEFAULT false,
  `businessActive` boolean DEFAULT false,
  `verificationScore` int DEFAULT 0,
  `lastVerifiedAt` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_businessId` (`businessId`),
  KEY `idx_verificationScore` (`verificationScore`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 5: Outreach Analytics
CREATE TABLE IF NOT EXISTS `outreachAnalytics` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `configId` int NOT NULL,
  `date` date NOT NULL,
  `totalSent` int DEFAULT 0,
  `totalDelivered` int DEFAULT 0,
  `totalOpened` int DEFAULT 0,
  `totalReplied` int DEFAULT 0,
  `totalInterested` int DEFAULT 0,
  `responseRate` decimal(5, 2) DEFAULT '0',
  `conversionRate` decimal(5, 2) DEFAULT '0',
  `avgLeadScore` decimal(5, 2) DEFAULT '0',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_configId` (`configId`),
  KEY `idx_date` (`date`),
  UNIQUE KEY `unique_config_date` (`configId`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
