CREATE TABLE `scoreboard_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scoreboard_id` integer NOT NULL,
	`match_number` integer NOT NULL,
	`map_name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`scoreboard_id`) REFERENCES `scoreboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scoreboard_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`placement` integer NOT NULL,
	`eliminations` integer DEFAULT 0 NOT NULL,
	`placement_points` integer DEFAULT 0 NOT NULL,
	`total_points` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `scoreboard_matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `scoreboard_teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scoreboard_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scoreboard_id` integer NOT NULL,
	`slot_number` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`scoreboard_id`) REFERENCES `scoreboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scoreboards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`mode` text DEFAULT 'team' NOT NULL,
	`point_system_id` integer,
	`owner_email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`point_system_id`) REFERENCES `point_systems`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `admins` ADD `can_leaderboard` integer DEFAULT false NOT NULL;