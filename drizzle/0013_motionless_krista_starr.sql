CREATE TABLE `check_ins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stage_id` integer NOT NULL,
	`registration_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`checked_at` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `event_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `group_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`registration_id` integer NOT NULL,
	`slot_number` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `tournament_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `event_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tournament_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stage_id` integer NOT NULL,
	`name` text NOT NULL,
	`group_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tournament_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stage_id` integer NOT NULL,
	`group_id` integer,
	`match_number` integer NOT NULL,
	`map_name` text DEFAULT 'Erangel' NOT NULL,
	`scheduled_at` text DEFAULT '' NOT NULL,
	`room_id` text DEFAULT '' NOT NULL,
	`room_password` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `tournament_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `tournament_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`name` text NOT NULL,
	`stage_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`roster_locked` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
