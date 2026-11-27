CREATE TABLE `roster_uploads` (
	`token` text PRIMARY KEY NOT NULL,
	`event_id` integer NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `roster_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `roster_entries` ADD `logo_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `roster_entries` ADD `logo_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `roster_entries` ADD `drive_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `roster_entries` ADD `drive_file_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `roster_events` ADD `drive_folder_url` text DEFAULT '' NOT NULL;