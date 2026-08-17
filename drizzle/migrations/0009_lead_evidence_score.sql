CREATE TABLE IF NOT EXISTS `leadEvidenceScores` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agencyId` int NOT NULL,
  `leadId` int NOT NULL,
  `score` int NOT NULL,
  `tier` varchar(40) NOT NULL,
  `confidence` int NOT NULL,
  `dimensions` json NOT NULL,
  `missingEvidence` json NOT NULL,
  `riskFlags` json NOT NULL,
  `nextAction` text NOT NULL,
  `scoringVersion` varchar(40) NOT NULL,
  `computedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leadEvidenceScores_leadId_unique` (`leadId`),
  KEY `leadEvidenceScores_agencyId_idx` (`agencyId`)
);
