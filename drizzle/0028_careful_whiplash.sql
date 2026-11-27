ALTER TABLE `scoreboard_matches` ADD `status` text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `scoreboard_matches` ADD `result_locked` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `scoreboard_results` ADD `calculation_mode` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `scoreboard_results` ADD `manual_points` integer;--> statement-breakpoint
ALTER TABLE `scoreboards` ADD `active_match_id` integer;