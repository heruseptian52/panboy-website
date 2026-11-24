CREATE TABLE `live_leaderboard_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scoreboard_id` integer NOT NULL,
	`overlay_token` text NOT NULL,
	`active_template_id` text DEFAULT 'pubg-style' NOT NULL,
	`templates_json` text DEFAULT '[]' NOT NULL,
	`state_json` text DEFAULT '{}' NOT NULL,
	`display_limit` text DEFAULT 'all' NOT NULL,
	`side` text DEFAULT 'right' NOT NULL,
	`show_legend` integer DEFAULT true NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`scoreboard_id`) REFERENCES `scoreboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `live_leaderboard_configs_scoreboard_id_unique` ON `live_leaderboard_configs` (`scoreboard_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `live_leaderboard_configs_overlay_token_unique` ON `live_leaderboard_configs` (`overlay_token`);