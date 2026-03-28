CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`sentiment` varchar(20),
	`intent` varchar(50),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitorId` varchar(64) NOT NULL,
	`visitorName` varchar(255),
	`visitorEmail` varchar(320),
	`visitorPhone` varchar(20),
	`status` enum('active','completed','handed_off') NOT NULL DEFAULT 'active',
	`leadScore` int DEFAULT 0,
	`estimatedSavings` decimal(10,2),
	`propertyAddress` text,
	`monthlyEnergyBill` decimal(8,2),
	`roofCondition` varchar(50),
	`sunExposure` varchar(50),
	`installationTimeline` varchar(50),
	`conversationData` json,
	`handedOffToAgent` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversations_visitorId_unique` UNIQUE(`visitorId`)
);
--> statement-breakpoint
CREATE TABLE `followUpEmails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`emailType` enum('initial','24h_followup','3day_followup','1week_followup','custom') NOT NULL,
	`subject` varchar(255),
	`content` text,
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`status` enum('scheduled','sent','failed','opened','clicked') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `followUpEmails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leadNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`userId` int,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leadNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leadTimeline` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`eventType` enum('created','status_changed','note_added','email_sent','call_made','meeting_scheduled') NOT NULL,
	`description` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leadTimeline_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`propertyAddress` text,
	`city` varchar(100),
	`state` varchar(50),
	`zipCode` varchar(10),
	`latitude` varchar(20),
	`longitude` varchar(20),
	`monthlyEnergyBill` decimal(8,2),
	`estimatedSavings` decimal(10,2),
	`roofCondition` varchar(50),
	`roofAge` int,
	`sunExposure` varchar(50),
	`homeownershipType` varchar(50),
	`installationTimeline` varchar(50),
	`status` enum('new','contacted','qualified','converted','rejected') NOT NULL DEFAULT 'new',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`leadScore` int DEFAULT 0,
	`source` varchar(50) DEFAULT 'chat',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceCoverageAreas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`state` varchar(50),
	`cities` text,
	`zipCodes` text,
	`centerLat` varchar(20),
	`centerLng` varchar(20),
	`active` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `serviceCoverageAreas_id` PRIMARY KEY(`id`)
);
