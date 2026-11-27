CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pubg_id` text NOT NULL,
	`nickname` text NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`photo_url` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_pubg_id_unique` ON `players` (`pubg_id`);--> statement-breakpoint
CREATE TABLE `registration_rosters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`slot_number` integer NOT NULL,
	`is_captain` integer DEFAULT false NOT NULL,
	`pubg_id_snapshot` text NOT NULL,
	`nickname_snapshot` text NOT NULL,
	`full_name_snapshot` text DEFAULT '' NOT NULL,
	`phone_snapshot` text DEFAULT '' NOT NULL,
	`photo_url_snapshot` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `event_registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`logo_url` text DEFAULT '' NOT NULL,
	`captain_name` text NOT NULL,
	`whatsapp` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_normalized_name_unique` ON `teams` (`normalized_name`);