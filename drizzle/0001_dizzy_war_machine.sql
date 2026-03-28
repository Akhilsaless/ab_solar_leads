CREATE TABLE `followUpEmails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`emailType` enum('initial','24h_followup','3day_followup','1week_followup','custom') NOT NULL,
	`emailStatus` enum('scheduled','sent','failed','bounced') NOT NULL DEFAULT 'scheduled',
	`scheduledAt` timestamp NOT NULL,
	`sentAt` timestamp,
	`subject` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`estimatedSavings` decimal(10,2),
	`personalizationData` json,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followUpEmails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leadNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leadNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leadTimeline` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`eventType` enum('status_change','contact','email_sent','note_added','score_updated') NOT NULL,
	`previousValue` varchar(255),
	`newValue` varchar(255),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leadTimeline_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`propertyAddress` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(50) NOT NULL,
	`zipCode` varchar(10) NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`monthlyEnergyBill` decimal(10,2),
	`roofCondition` enum('excellent','good','fair','poor'),
	`roofAge` int,
	`sunExposure` enum('full','partial','shaded'),
	`installationTimeline` enum('immediate','3-6months','6-12months','exploring') DEFAULT 'exploring',
	`homeownershipType` enum('owned','financed','rented'),
	`status` enum('new','contacted','qualified','converted','rejected') NOT NULL DEFAULT 'new',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`source` varchar(100) DEFAULT 'website',
	`leadScore` int DEFAULT 0,
	`estimatedSavings` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastContactedAt` timestamp,
	`convertedAt` timestamp,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceCoverageAreas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(50) NOT NULL,
	`zipCodes` text,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`radius` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceCoverageAreas_id` PRIMARY KEY(`id`)
);
