CREATE TABLE `event_point_systems` (
	`event_id` integer PRIMARY KEY NOT NULL,
	`point_system_id` integer NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`point_system_id`) REFERENCES `point_systems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `point_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stage_id` integer NOT NULL,
	`registration_id` integer NOT NULL,
	`type` text NOT NULL,
	`points` integer NOT NULL,
	`reason` text NOT NULL,
	`admin_email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `event_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `point_system_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`point_system_id` integer NOT NULL,
	`version` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`admin_email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`point_system_id`) REFERENCES `point_systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `point_systems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`placement_json` text NOT NULL,
	`elimination_point` integer DEFAULT 1 NOT NULL,
	`tie_break_json` text NOT NULL,
	`special_rules` text DEFAULT '' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tournament_matches` ADD `result_locked` integer DEFAULT false NOT NULL;