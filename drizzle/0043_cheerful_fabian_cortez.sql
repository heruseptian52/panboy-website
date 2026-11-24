CREATE TABLE `blacklist_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`blacklist_id` integer NOT NULL,
	`visitor_token` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`blacklist_id`) REFERENCES `blacklist_players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blacklist_feedback_unique` ON `blacklist_feedback` (`blacklist_id`,`visitor_token`);