ALTER TABLE `events` ADD `event_mode` text DEFAULT 'Online' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `province` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `address` text DEFAULT '' NOT NULL;