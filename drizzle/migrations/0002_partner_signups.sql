CREATE TABLE IF NOT EXISTS `partnerSignups` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `companyName` varchar(255) NOT NULL,
  `contactName` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `address` text,
  `city` varchar(100),
  `state` varchar(100),
  `panNumber` varchar(50),
  `gstNumber` varchar(50),
  `partnerSlug` varchar(100) NOT NULL UNIQUE,
  `status` enum('new','contacted','interested','converted') NOT NULL DEFAULT 'new',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_partnerSlug` (`partnerSlug`),
  KEY `idx_status` (`status`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
