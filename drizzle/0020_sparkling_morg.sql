ALTER TABLE `admins` ADD `access_expires_at` text;--> statement-breakpoint
UPDATE `admins` SET `access_expires_at`=strftime('%Y-%m-%dT%H:%M:%fZ','now','+30 days') WHERE `access_expires_at` IS NULL;
