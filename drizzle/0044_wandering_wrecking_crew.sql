CREATE TABLE `roster_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`team_name` text NOT NULL,
	`players_json` text NOT NULL,
	`edit_token_hash` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `roster_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_roster_entries_event` ON `roster_entries` (`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_roster_entries_event_team` ON `roster_entries` (`event_id`,`team_name`);--> statement-breakpoint
CREATE TABLE `roster_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`deadline` text NOT NULL,
	`stopped` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
