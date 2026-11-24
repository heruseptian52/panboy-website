CREATE TABLE `event_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`event_id` integer NOT NULL,
	`team_name` text NOT NULL,
	`team_logo` text NOT NULL,
	`whatsapp` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`payment_order_id` text DEFAULT '' NOT NULL,
	`paid_at` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_registrations_code_unique` ON `event_registrations` (`code`);--> statement-breakpoint
ALTER TABLE `events` ADD `max_slots` integer DEFAULT 0 NOT NULL;